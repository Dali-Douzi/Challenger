const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "challenger/avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
    public_id: (req, file) => {
      return `avatar_${req.user?.userId || Date.now()}_${Math.round(
        Math.random() * 1e9
      )}`;
    },
  },
});

const avatarUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, cb) {
    const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only image files (PNG, JPG, JPEG, WEBP) are allowed!"),
        false
      );
    }
  },
});

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

const getCookieConfig = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  domain:
    process.env.NODE_ENV === "production"
      ? process.env.COOKIE_DOMAIN
      : undefined,
});

const deleteOldAvatar = async (avatarUrl) => {
  try {
    if (avatarUrl && avatarUrl.includes("cloudinary")) {
      const publicId = avatarUrl.split("/").pop().split(".")[0];
      const fullPublicId = `challenger/avatars/${publicId}`;

      const result = await cloudinary.uploader.destroy(fullPublicId);
      console.log(
        `Deleted old avatar from Cloudinary: ${fullPublicId}`,
        result
      );
    }
  } catch (error) {
    console.error("Error deleting old avatar from Cloudinary:", error);
  }
};

const validateUserChanges = async (userId, changes) => {
  const errors = [];
  const { username, email, password } = changes;

  if (username) {
    if (username.length < 3) {
      errors.push("Username must be at least 3 characters long");
    } else {
      const usernameExists = await User.findOne({
        username,
        _id: { $ne: userId },
      });
      if (usernameExists)
        errors.push(
          "Username is already taken, try adding numbers or special characters"
        );
    }
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push("Please provide a valid email address");
    } else {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) errors.push("Email is already taken");
    }
  }

  if (password) {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const commonPasswords = [
      "password",
      "12345678",
      "qwerty123",
      "password123",
      "admin123",
    ];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    } else if (!passwordRegex.test(password)) {
      errors.push(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
      );
    } else if (commonPasswords.includes(password.toLowerCase())) {
      errors.push(
        "Password is too common, please choose a more secure password"
      );
    }
  }

  return { isValid: errors.length === 0, errors };
};

const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>]/g, "");
};

const sendErrorResponse = (res, status, message, details = null) => {
  const response = { success: false, message };
  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }
  return res.status(status).json(response);
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  const cookieConfig = getCookieConfig();

  res.cookie("accessToken", accessToken, {
    ...cookieConfig,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieConfig,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  const cookieConfig = getCookieConfig();
  res.clearCookie("accessToken", cookieConfig);
  res.clearCookie("refreshToken", cookieConfig);
};

// Orphaned cleanup function for post-deletion cleanup
const runPostDeletionCleanup = async (verbose = false) => {
  try {
    if (verbose) console.log("🧹 Running post-deletion cleanup...");

    // Import models locally to avoid circular dependencies
    const Team = require("../models/Team");
    const Scrim = require("../models/Scrim");
    const Notification = require("../models/Notification");
    const ScrimChat = require("../models/ScrimChat");

    // Find and delete orphaned teams (those with deleted owners)
    const orphanedTeams = await Team.find({}).populate("owner", "_id");
    let cleanedTeams = 0;

    for (const team of orphanedTeams) {
      if (!team.owner) {
        // Remove from users' teams arrays
        await User.updateMany(
          { teams: team._id },
          { $pull: { teams: team._id } }
        );

        // Delete orphaned scrims where this team was teamA
        const orphanedScrims = await Scrim.find({ teamA: team._id });
        for (const scrim of orphanedScrims) {
          await ScrimChat.deleteMany({ scrim: scrim._id });
          await Notification.deleteMany({ scrim: scrim._id });
          await Scrim.findByIdAndDelete(scrim._id);
        }

        // Remove team from other scrims' requests
        await Scrim.updateMany(
          { requests: team._id },
          { $pull: { requests: team._id } }
        );

        await Team.findByIdAndDelete(team._id);
        cleanedTeams++;
        if (verbose) console.log(`🧹 Cleaned orphaned team: ${team.name}`);
      }
    }

    // Find and delete orphaned scrims (those with deleted teamA)
    const orphanedScrims = await Scrim.find({}).populate("teamA", "_id");
    let cleanedScrims = 0;

    for (const scrim of orphanedScrims) {
      if (!scrim.teamA) {
        await ScrimChat.deleteMany({ scrim: scrim._id });
        await Notification.deleteMany({ scrim: scrim._id });
        await Scrim.findByIdAndDelete(scrim._id);
        cleanedScrims++;
        if (verbose) console.log(`🧹 Cleaned orphaned scrim: ${scrim._id}`);
      }
    }

    if (verbose) {
      console.log(
        `✅ Post-deletion cleanup completed: ${cleanedTeams} teams, ${cleanedScrims} scrims`
      );
    }

    return { cleanedTeams, cleanedScrims };
  } catch (error) {
    console.error("⚠️ Post-deletion cleanup failed:", error);
    return { cleanedTeams: 0, cleanedScrims: 0, error: error.message };
  }
};

router.post("/signup", authLimiter, (req, res) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) {
      console.error("Avatar upload error:", err);

      const errorMessage =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Maximum size is 10MB"
          : err.message || "Avatar upload failed";

      return sendErrorResponse(res, 400, errorMessage);
    }

    try {
      let { username, email, password } = req.body;

      username = sanitizeInput(username);
      email = sanitizeInput(email);

      if (!username || !email || !password) {
        return sendErrorResponse(
          res,
          400,
          "Please provide username, email, and password"
        );
      }

      const validation = await validateUserChanges(null, {
        username,
        email,
        password,
      });
      if (!validation.isValid) {
        return sendErrorResponse(res, 400, validation.errors.join(". "));
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        return sendErrorResponse(
          res,
          400,
          "User with this email or username already exists"
        );
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      const userData = {
        username,
        email,
        password: hashedPassword,
        teams: [],
        avatar: req.file ? req.file.path : "", // Cloudinary URL
      };

      const user = new User(userData);
      await user.save();

      const { accessToken, refreshToken } = generateTokens(user._id);
      setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          teams: user.teams,
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      sendErrorResponse(
        res,
        500,
        "Server error during registration",
        error.message
      );
    }
  });
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    let { identifier, password, rememberMe } = req.body;

    identifier = sanitizeInput(identifier);

    if (!identifier || !password) {
      return sendErrorResponse(
        res,
        400,
        "Please provide username/email and password"
      );
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const user = await User.findOne(
      isEmail ? { email: identifier } : { username: identifier }
    );

    if (!user) {
      return sendErrorResponse(res, 401, "Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        teams: user.teams,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    sendErrorResponse(res, 500, "Server error during login", error.message);
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return sendErrorResponse(res, 401, "Refresh token not provided");
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      clearAuthCookies(res);
      return sendErrorResponse(res, 401, "User not found");
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id
    );
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        teams: user.teams,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    clearAuthCookies(res);
    sendErrorResponse(res, 401, "Invalid refresh token");
  }
});

router.post("/logout", (req, res) => {
  clearAuthCookies(res);
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

router.put("/change-email", auth, async (req, res) => {
  try {
    let { newEmail, currentPassword } = req.body;

    newEmail = sanitizeInput(newEmail);

    if (!newEmail || !currentPassword) {
      return sendErrorResponse(
        res,
        400,
        "Please provide new email and current password"
      );
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, "Current password is incorrect");
    }

    const validation = await validateUserChanges(user._id, { email: newEmail });
    if (!validation.isValid) {
      return sendErrorResponse(res, 400, validation.errors.join(". "));
    }

    user.email = newEmail;
    await user.save();

    res.json({
      success: true,
      message: "Email updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        teams: user.teams,
      },
    });
  } catch (error) {
    console.error("Change email error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while updating email",
      error.message
    );
  }
});

router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendErrorResponse(
        res,
        400,
        "Please provide current password and new password"
      );
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, "Current password is incorrect");
    }

    const validation = await validateUserChanges(user._id, {
      password: newPassword,
    });
    if (!validation.isValid) {
      return sendErrorResponse(res, 400, validation.errors.join(". "));
    }

    const salt = await bcrypt.genSalt(12);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedNewPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while updating password",
      error.message
    );
  }
});

router.put("/change-username", auth, async (req, res) => {
  try {
    let { newUsername, currentPassword } = req.body;

    newUsername = sanitizeInput(newUsername);

    if (!newUsername || !currentPassword) {
      return sendErrorResponse(
        res,
        400,
        "Please provide new username and current password"
      );
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, "Current password is incorrect");
    }

    const validation = await validateUserChanges(user._id, {
      username: newUsername,
    });
    if (!validation.isValid) {
      return sendErrorResponse(res, 400, validation.errors.join(". "));
    }

    user.username = newUsername;
    await user.save();

    res.json({
      success: true,
      message: "Username updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        teams: user.teams,
      },
    });
  } catch (error) {
    console.error("Change username error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while updating username",
      error.message
    );
  }
});

router.put("/change-avatar", auth, (req, res) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) {
      console.error("Avatar upload error:", err);

      const errorMessage =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Maximum size is 10MB"
          : err.message || "Avatar upload failed";

      return sendErrorResponse(res, 400, errorMessage);
    }

    try {
      if (!req.file) {
        return sendErrorResponse(res, 400, "Please provide an avatar image");
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return sendErrorResponse(res, 404, "User not found");
      }

      if (user.avatar) {
        await deleteOldAvatar(user.avatar);
      }

      user.avatar = req.file.path; // Cloudinary URL
      await user.save();

      console.log("Avatar updated successfully:", user.avatar);

      res.json({
        success: true,
        message: "Avatar updated successfully",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          teams: user.teams,
        },
      });
    } catch (error) {
      console.error("Change avatar error:", error);
      sendErrorResponse(
        res,
        500,
        "Server error while updating avatar",
        error.message
      );
    }
  });
});

router.delete("/delete-avatar", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
      user.avatar = "";
      await user.save();
    }

    res.json({
      success: true,
      message: "Avatar deleted successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        teams: user.teams,
      },
    });
  } catch (error) {
    console.error("Delete avatar error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while deleting avatar",
      error.message
    );
  }
});

// User account deletion with orphaned objects cleanup
router.delete("/delete-account", auth, async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword) {
      return sendErrorResponse(
        res,
        400,
        "Please provide your current password to delete your account"
      );
    }

    // Find and verify user
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, "Current password is incorrect");
    }

    console.log(`🗑️ User deletion initiated: ${user.username} (${user.email})`);

    // Delete old avatar from Cloudinary if exists
    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }

    // Import Team model locally to avoid circular dependency
    const Team = require("../models/Team");

    // Remove user from all teams they're a member of
    await Team.updateMany(
      { "members.user": userId },
      { $pull: { members: { user: userId } } }
    );

    // Delete the user account
    await User.findByIdAndDelete(userId);

    // Clear authentication cookies
    clearAuthCookies(res);

    console.log(`✅ User account deleted: ${user.username}`);

    // Trigger immediate cleanup of orphaned objects
    try {
      const cleanupResults = await runPostDeletionCleanup(true);
      console.log("✅ Post-deletion cleanup completed:", cleanupResults);
    } catch (cleanupError) {
      // Don't fail the user deletion if cleanup fails
      console.error("⚠️ Post-deletion cleanup failed:", cleanupError);
    }

    res.json({
      success: true,
      message: "Account deleted successfully. We're sorry to see you go!",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while deleting account",
      error.message
    );
  }
});

router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        teams: user.teams,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while fetching profile",
      error.message
    );
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        teams: user.teams,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while fetching user",
      error.message
    );
  }
});

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Auth service is healthy",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

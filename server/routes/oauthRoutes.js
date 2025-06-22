const express = require("express");
const passport = require("../config/passport");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Helper function to generate tokens and set cookies
const generateTokensAndSetCookies = (user, res) => {
  const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    domain:
      process.env.NODE_ENV === "production"
        ? process.env.COOKIE_DOMAIN
        : undefined,
  };

  res.cookie("accessToken", accessToken, {
    ...cookieConfig,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieConfig,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return { accessToken, refreshToken };
};

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/error?message=Authentication failed`
        );
      }

      generateTokensAndSetCookies(req.user, res);

      // Redirect to frontend success page
      res.redirect(`${process.env.CLIENT_URL}/auth/success`);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(
        `${process.env.CLIENT_URL}/auth/error?message=Token generation failed`
      );
    }
  }
);

// Discord OAuth routes
router.get("/discord", passport.authenticate("discord"));

router.get(
  "/discord/callback",
  passport.authenticate("discord", { session: false }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/error?message=Authentication failed`
        );
      }

      generateTokensAndSetCookies(req.user, res);
      res.redirect(`${process.env.CLIENT_URL}/auth/success`);
    } catch (error) {
      console.error("Discord OAuth callback error:", error);
      res.redirect(
        `${process.env.CLIENT_URL}/auth/error?message=Token generation failed`
      );
    }
  }
);

// Twitch OAuth routes
router.get(
  "/twitch",
  passport.authenticate("twitch", { scope: "user:read:email" })
);

router.get(
  "/twitch/callback",
  passport.authenticate("twitch", { session: false }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/error?message=Authentication failed`
        );
      }

      generateTokensAndSetCookies(req.user, res);
      res.redirect(`${process.env.CLIENT_URL}/auth/success`);
    } catch (error) {
      console.error("Twitch OAuth callback error:", error);
      res.redirect(
        `${process.env.CLIENT_URL}/auth/error?message=Token generation failed`
      );
    }
  }
);

// Route to check which providers are linked to current user
router.get("/linked-accounts", async (req, res) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const linkedAccounts = {
      google: !!user.googleId,
      discord: !!user.discordId,
      twitch: !!user.twitchId,
      primary: user.authProvider,
    };

    res.json({
      success: true,
      data: linkedAccounts,
    });
  } catch (error) {
    console.error("Error getting linked accounts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Route to unlink OAuth accounts
router.delete("/unlink/:provider", async (req, res) => {
  try {
    const { provider } = req.params;
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent unlinking if it's the only auth method
    const linkedProviders = [
      user.googleId ? "google" : null,
      user.discordId ? "discord" : null,
      user.twitchId ? "twitch" : null,
      user.authProvider === "local" ? "local" : null,
    ].filter(Boolean);

    if (linkedProviders.length <= 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot unlink the only authentication method",
      });
    }

    // Unlink the provider
    switch (provider) {
      case "google":
        user.googleId = undefined;
        break;
      case "discord":
        user.discordId = undefined;
        break;
      case "twitch":
        user.twitchId = undefined;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid provider",
        });
    }

    // Update primary provider if necessary
    if (user.authProvider === provider) {
      user.authProvider =
        linkedProviders.find((p) => p !== provider) || "local";
    }

    await user.save();

    res.json({
      success: true,
      message: `${provider} account unlinked successfully`,
    });
  } catch (error) {
    console.error("Error unlinking account:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;

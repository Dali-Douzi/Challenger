const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = await User.create({ username, email, password });
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      }),
    });
  } catch (error) {
    console.error("🔥 Signup Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      }),
    });
  } catch (error) {
    console.error("🔥 Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("🔥 Profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/update", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    if (username) user.username = username;
    if (email) user.email = email;
    await user.save();
    res
      .status(200)
      .json({ _id: user._id, username: user.username, email: user.email });
  } catch (error) {
    console.error("🔥 Update Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/avatar", protect, (req, res) => {
  // Get the avatar upload middleware from app
  const avatarUpload = req.app.get("avatarUpload");

  // Use the middleware
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) {
      console.error("🔥 Avatar upload error:", err);
      return res.status(400).json({ message: err.message });
    }

    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.avatar = `/uploads/avatars/${req.file.filename}`;
      await user.save();

      res.status(200).json({ avatar: user.avatar });
    } catch (err) {
      console.error("🔥 Avatar upload error:", err);
      res.status(500).json({ message: "Upload failed", error: err.message });
    }
  });
});

module.exports = router;

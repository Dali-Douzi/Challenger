const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ScrimChat = require("../models/ScrimChat");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");

/**
 * @desc    Get all chats for scrims where the user's team is involved
 * @route   GET /api/chats
 * @access  Private
 */
router.get("/", protect, async (req, res) => {
  try {
    // 1. Find teams where the user is owner or member
    const teams = await Team.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    }).select("_id");
    const teamIds = teams.map((t) => t._id);

    console.log(`💬 Finding chats for user ${req.user.id}, teams:`, teamIds);

    // 2. Find all scrims where user's teams are involved (any status)
    const scrims = await Scrim.find({
      $or: [
        { teamA: { $in: teamIds } },
        { teamB: { $in: teamIds } },
        { requests: { $in: teamIds } },
      ],
    }).select("_id");
    const scrimIds = scrims.map((s) => s._id);

    console.log(`💬 Found ${scrimIds.length} relevant scrims`);

    // 3. Find all chats for those scrims
    const chats = await ScrimChat.find({
      scrim: { $in: scrimIds },
    })
      .populate({
        path: "scrim",
        populate: [
          { path: "teamA", select: "name _id" },
          { path: "teamB", select: "name _id" },
        ],
      })
      .sort({ updatedAt: -1 }); // Most recently updated first

    console.log(`💬 Returning ${chats.length} chats`);

    // 4. Filter out chats where scrim doesn't have proper team info
    const validChats = chats.filter(
      (chat) =>
        chat.scrim &&
        chat.scrim.teamA &&
        (chat.scrim.teamB || chat.scrim.status === "open")
    );

    console.log(`💬 ${validChats.length} valid chats after filtering`);

    res.json(validChats);
  } catch (error) {
    console.error("🔥 Error fetching chats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

const express = require("express");
const mongoose = require("mongoose");
const ScrimChat = require("../models/ScrimChat");
const Team = require("../models/Team");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @desc   List all chat threads involving any of this user’s teams
 * @route  GET /api/scrims/chat
 * @access Private
 */
router.get("/", protect, async (req, res) => {
  try {
    // 1) Gather all the team IDs this user belongs to
    const teams = await Team.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    }).select("_id");
    const teamIds = teams.map((t) => t._id);

    // 2) Find all chat threads where they’re owner OR challenger
    const chats = await ScrimChat.find({
      $or: [{ owner: { $in: teamIds } }, { challenger: { $in: teamIds } }],
    })
      .populate("owner", "name")
      .populate("challenger", "name")
      .populate({
        path: "scrim",
        select: "scheduledTime format teamA teamB",
        populate: [
          { path: "teamA", select: "name" },
          { path: "teamB", select: "name" },
        ],
      })
      .sort({ "scrim.scheduledTime": 1 });

    res.json(chats);
  } catch (err) {
    console.error("🔥 Chat-list Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @desc   Fetch chat history for this user’s chat thread
 * @route  GET /api/scrims/chat/:scrimId
 * @access Private
 */
router.get("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
  const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

  if (!mongoose.Types.ObjectId.isValid(scrimId)) {
    return res.status(400).json({ message: "Invalid scrim ID format" });
  }

  // 1) Gather this user’s team IDs
  const teams = await Team.find({
    $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
  }).select("_id");
  const teamIds = teams.map((t) => t._id);

  // 2) Fetch only the chat where they’re owner OR challenger
  let chat = await ScrimChat.findOne({
    scrim: mongoose.Types.ObjectId(scrimId),
    $or: [{ owner: { $in: teamIds } }, { challenger: { $in: teamIds } }],
  }).populate("messages.sender", "username avatar");

  if (!chat) {
    return res.json({ messages: [] });
  }

  const sorted = chat.messages
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(skip, skip + limit);

  res.json({ messages: sorted });
});

/**
 * @desc   Send a new message in a chat thread
 * @route  POST /api/scrims/chat/:scrimId
 * @access Private
 */
router.post("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }
  if (!mongoose.Types.ObjectId.isValid(scrimId)) {
    return res.status(400).json({ message: "Invalid scrim ID format" });
  }

  // 1) Gather this user’s team IDs
  const teams = await Team.find({
    $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
  }).select("_id");
  const teamIds = teams.map((t) => t._id);

  // 2) Find the correct chat thread
  let chat = await ScrimChat.findOne({
    scrim: mongoose.Types.ObjectId(scrimId),
    $or: [{ owner: { $in: teamIds } }, { challenger: { $in: teamIds } }],
  });
  if (!chat) {
    return res.status(404).json({ message: "Chat thread not found" });
  }

  // 3) Append and save the message
  const msg = {
    sender: req.user.id,
    text,
    timestamp: new Date(),
  };
  chat.messages.push(msg);
  await chat.save();

  res.status(201).json({ message: "Message sent", msg });
});

module.exports = router;

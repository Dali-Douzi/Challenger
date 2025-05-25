const express = require("express");
const mongoose = require("mongoose");
const ScrimChat = require("../models/ScrimChat");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * Only allow access if the user is the owner or a member of any involved team:
 *  - teamA
 *  - any team in scrim.requests
 *  - teamB (if set)
 */
async function canAccessChat(userId, scrim) {
  const teamIds = [scrim.teamA];

  if (Array.isArray(scrim.requests) && scrim.requests.length) {
    teamIds.push(...scrim.requests);
  }
  if (scrim.teamB) {
    teamIds.push(scrim.teamB);
  }

  for (const teamId of teamIds) {
    const team = await Team.findById(teamId);
    if (!team) continue;

    // Owner check
    if (team.owner.toString() === userId) {
      return true;
    }
    // Membership check
    if (
      Array.isArray(team.members) &&
      team.members.some((m) => m.user.toString() === userId)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * GET /api/scrims/chat/:scrimId?limit=&skip=
 * Fetch chat history (oldest→newest), paginated.
 */
router.get("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
  const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

  if (!mongoose.Types.ObjectId.isValid(scrimId)) {
    return res.status(400).json({ message: "Invalid scrim ID format" });
  }

  const scrim = await Scrim.findById(scrimId);
  if (!scrim) {
    return res.status(404).json({ message: "Scrim not found" });
  }

  if (!(await canAccessChat(req.user.id, scrim))) {
    return res.status(403).json({ message: "Not authorized to access chat" });
  }

  // **Populate sender details on each message**
  const chat = await ScrimChat.findOne({ scrim: scrimId }).populate(
    "messages.sender",
    "username avatar"
  );

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
 * POST /api/scrims/chat/:scrimId
 * Send a new message.
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

  const scrim = await Scrim.findById(scrimId);
  if (!scrim) {
    return res.status(404).json({ message: "Scrim not found" });
  }
  if (!(await canAccessChat(req.user.id, scrim))) {
    return res.status(403).json({ message: "Not authorized to send messages" });
  }

  let chat = await ScrimChat.findOne({ scrim: scrimId });
  if (!chat) {
    chat = await ScrimChat.create({ scrim: scrimId, messages: [] });
  }

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

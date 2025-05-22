const express = require("express");
const mongoose = require("mongoose");
const ScrimChat = require("../models/ScrimChat");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

async function canAccessChat(userId, scrim) {
  const isTeamA = scrim.teamA.toString() === userId;
  const isRequester = scrim.requests
    .map((id) => id.toString())
    .includes(userId);
  let isTeamB = false;
  if (scrim.teamB) {
    const teamB = await Team.findById(scrim.teamB);
    if (teamB) {
      isTeamB =
        teamB.owner.toString() === userId ||
        teamB.members.some(
          (m) => m.user.toString() === userId && m.role === "manager"
        );
    }
  }
  if (isTeamA || isRequester || isTeamB) return true;
  // also allow teamA manager
  const teamA = await Team.findById(scrim.teamA);
  if (teamA) {
    const isManagerA = teamA.members.some(
      (m) => m.user.toString() === userId && m.role === "manager"
    );
    if (isManagerA) return true;
  }
  return false;
}

/**
 * GET /api/scrims/chat/:scrimId?limit=&skip=
 * Fetch chat history (sorted oldest→newest), paginated
 */
router.get("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const limit = Math.max(parseInt(req.query.limit) || 50, 1);
  const skip = Math.max(parseInt(req.query.skip) || 0, 0);

  if (!mongoose.Types.ObjectId.isValid(scrimId)) {
    return res.status(400).json({ message: "Invalid scrim ID format" });
  }
  const scrim = await Scrim.findById(scrimId);
  if (!scrim) return res.status(404).json({ message: "Scrim not found" });

  if (!(await canAccessChat(req.user.id, scrim))) {
    return res.status(403).json({ message: "Not authorized to access chat" });
  }

  const chat = await ScrimChat.findOne({ scrim: scrimId });
  if (!chat) return res.json({ messages: [] });

  const sorted = chat.messages
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(skip, skip + limit);

  res.json({ messages: sorted });
});

/**
 * POST /api/scrims/chat/:scrimId
 * Send a new message
 */
router.post("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "Text is required" });

  if (!mongoose.Types.ObjectId.isValid(scrimId)) {
    return res.status(400).json({ message: "Invalid scrim ID format" });
  }
  const scrim = await Scrim.findById(scrimId);
  if (!scrim) return res.status(404).json({ message: "Scrim not found" });

  if (!(await canAccessChat(req.user.id, scrim))) {
    return res.status(403).json({ message: "Not authorized to send messages" });
  }

  let chat = await ScrimChat.findOne({ scrim: scrimId });
  if (!chat) {
    chat = new ScrimChat({ scrim: scrimId, messages: [] });
  }

  const msg = { sender: req.user.id, text, timestamp: new Date() };
  chat.messages.push(msg);
  await chat.save();

  res.status(201).json({ message: "Message sent", msg });
});

/**
 * DELETE /api/scrims/chat/:scrimId
 * Disabled — chat history is permanent
 */
router.delete("/:scrimId", protect, (_req, res) => {
  res.status(403).json({ message: "Chat deletion is not allowed" });
});

module.exports = router;

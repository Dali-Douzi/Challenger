const express = require("express");
const mongoose = require("mongoose");
const ScrimChat = require("../models/ScrimChat");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Helper for checking access: “canAccessChat”
async function canAccessChat(userId, scrim) {
  const teamIds = [scrim.teamA];

  if (Array.isArray(scrim.requests) && scrim.requests.length) {
    scrim.requests.forEach((id) => teamIds.push(id.toString()));
  }
  if (scrim.teamB) {
    teamIds.push(scrim.teamB.toString());
  }

  for (const tId of teamIds) {
    const team = await Team.findById(tId);
    if (!team) continue;
    if (
      team.owner.toString() === userId ||
      team.members.some((m) => m.user.toString() === userId)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * GET /api/chats/:chatId
 * Fetch chat history by chatId (newest ← oldest), paginated if you want (skip/limit).
 */
router.get("/:chatId", protect, async (req, res) => {
  const { chatId } = req.params;
  const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
  const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chat ID format" });
  }

  // 1) Load the chat document
  const chat = await ScrimChat.findById(chatId).populate(
    "messages.sender",
    "username avatar"
  );
  if (!chat) {
    return res.status(404).json({ message: "Chat not found" });
  }

  // 2) Load the associated scrim, then check “canAccessChat”
  const scrim = await Scrim.findById(chat.scrim);
  if (!scrim) {
    return res.status(404).json({ message: "Related scrim not found" });
  }
  if (!(await canAccessChat(req.user.id, scrim))) {
    return res.status(403).json({ message: "Not authorized to access chat" });
  }

  // 3) Sort & paginate messages
  const sorted = chat.messages
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(skip, skip + limit);

  // 4) Return both messages and scrim info in one payload
  return res.json({ messages: sorted, scrim });
});

/**
 * POST /api/chats/:chatId
 * Send a new message to an existing chat thread.
 */
router.post("/:chatId", protect, async (req, res) => {
  const { chatId } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Text is required" });
  }
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chat ID format" });
  }

  // 1) Load the chat doc
  const chat = await ScrimChat.findById(chatId);
  if (!chat) {
    return res.status(404).json({ message: "Chat not found" });
  }

  // 2) Load the scrim to check permissions
  const scrim = await Scrim.findById(chat.scrim);
  if (!scrim) {
    return res.status(404).json({ message: "Related scrim not found" });
  }
  if (!(await canAccessChat(req.user.id, scrim))) {
    return res.status(403).json({ message: "Not authorized to send messages" });
  }

  // 3) Append the new message
  const msg = {
    sender: req.user.id,
    text,
    timestamp: new Date(),
  };
  chat.messages.push(msg);
  await chat.save();

  // 4) Populate the sender’s info for the response
  const senderUser = await User.findById(req.user.id).select("username avatar");

  // 5) Build notifications for all _other_ teams in this scrim
  const allTeams = [
    scrim.teamA.toString(),
    ...(Array.isArray(scrim.requests)
      ? scrim.requests.map((id) => id.toString())
      : []),
    ...(scrim.teamB ? [scrim.teamB.toString()] : []),
  ];

  // Determine which team the sender belongs to
  let senderTeam = null;
  for (const tId of allTeams) {
    const team = await Team.findById(tId);
    if (
      team.owner.toString() === req.user.id ||
      team.members.some((m) => m.user.toString() === req.user.id)
    ) {
      senderTeam = tId;
      break;
    }
  }
  const senderTeamObj = await Team.findById(senderTeam);
  const senderTeamName = senderTeamObj ? senderTeamObj.name : "Unknown Team";

  // Notify all other teams
  const recipients = allTeams.filter((id) => id !== senderTeam);
  await Promise.all(
    recipients.map((teamId) =>
      Notification.create({
        team: teamId,
        scrim: scrim._id,
        chat: chat._id,
        message: `New message from ${senderTeamName}: ${text}`,
        type: "message",
        url: `/chats/${chat._id}`, // redirect to THIS chat thread
      })
    )
  );

  // 6) Broadcast the new message back (sender populated)
  req.app
    .get("io")
    .to(chatId)
    .emit("newMessage", {
      ...msg,
      sender: senderUser,
    });

  return res
    .status(201)
    .json({ message: "Message sent", msg: { ...msg, sender: senderUser } });
});

module.exports = router;

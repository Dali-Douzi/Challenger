const express = require("express");
const mongoose = require("mongoose");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const Game = require("../models/Game");
const Notification = require("../models/Notification");
const ScrimChat = require("../models/ScrimChat");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @desc    List all scrims (open and booked)
 * @route   GET /api/scrims
 * @access  Private
 */
router.get("/", protect, async (req, res) => {
  try {
    const scrims = await Scrim.find()
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("requests", "name logo");
    res.json(scrims);
  } catch (error) {
    console.error("🔥 List scrims Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc    Create a new scrim
 * @route   POST /api/scrims
 * @access  Private (owner or manager)
 */
router.post("/", protect, async (req, res) => {
  const { teamId, format, scheduledTime } = req.body;
  try {
    // Validate teamId
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID format" });
    }
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check owner/manager
    const isOwner = team.owner.toString() === req.user.id;
    const isManager = team.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res
        .status(403)
        .json({ message: "Not authorized to create scrim" });
    }

    // Resolve the Game document
    let gameDoc = null;
    if (mongoose.Types.ObjectId.isValid(team.game)) {
      gameDoc = await Game.findById(team.game).select("formats name");
    }
    if (!gameDoc) {
      gameDoc = await Game.findOne({ name: team.game }).select("formats name");
    }
    if (!gameDoc) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Validate format
    if (!gameDoc.formats.includes(format)) {
      return res
        .status(400)
        .json({ message: `Invalid format for ${gameDoc.name}` });
    }

    // Create
    const scrim = await Scrim.create({
      teamA: team._id,
      game: gameDoc._id,
      format,
      scheduledTime: new Date(scheduledTime),
      status: "open",
    });
    res.status(201).json(scrim);
  } catch (error) {
    console.error("🔥 Scrim-create Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc    Team B requests to join an open scrim
 * @route   POST /api/scrims/request/:scrimId
 * @access  Private
 */
router.post("/request/:scrimId", protect, async (req, res) => {
  console.log("→ [ScrimRequest] params:", req.params);
  console.log("→ [ScrimRequest] body:  ", req.body);
  try {
    const { scrimId } = req.params;
    const { teamId } = req.body;

    // 1) Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(scrimId) ||
      !mongoose.Types.ObjectId.isValid(teamId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // 2) Look up scrim
    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({ message: "Scrim not found" });
    }
    if (scrim.status !== "open") {
      return res
        .status(400)
        .json({ message: "Scrim is not open for requests" });
    }

    // 3) Make sure the team exists (and optionally belongs to this user)
    const requestingTeam = await Team.findById(teamId);
    if (!requestingTeam) {
      return res.status(404).json({ message: "Requesting team not found" });
    }

    // 4) Prevent duplicates
    if (scrim.requests.some((id) => id.toString() === teamId)) {
      return res.status(400).json({ message: "Scrim request already sent" });
    }

    // 5) Save the request
    scrim.requests.push(teamId);
    await scrim.save();

    // 6) Notify the owner
    let chat = await ScrimChat.findOne({ scrim: scrim._id });
    if (!chat) {
      chat = new ScrimChat({ scrim: scrim._id, messages: [] });
      await chat.save();
    }

    const notification = await Notification.create({
      team: scrim.teamA,
      scrim: scrim._id,
      chat: chat._id,
      message: `${requestingTeam.name} requested your scrim`,
      type: "request",
      url: `/scrims/${scrim._id}/requests`,
    });

    // 🚨 EMIT SOCKET EVENT
    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: scrim.teamA, // Only notify the scrim owner (Team A)
        notification: notification,
      });
      console.log(
        `🔔 Emitted scrim request notification to team ${scrim.teamA}`
      );
    }

    // 7) Return success
    return res.json({ message: "Scrim request sent", scrim });
  } catch (error) {
    console.error("🔥 Scrim-request Error:", error.stack);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc    Fetch a single scrim (owner/manager sees pending requests)
 * @route   GET /api/scrims/:scrimId
 * @access  Private
 */
router.get("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(scrimId)) {
    return res.status(400).json({ message: "Invalid scrim ID format" });
  }
  try {
    const scrim = await Scrim.findById(scrimId)
      .populate("teamA", "name logo owner members game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("requests", "name logo");
    if (!scrim) {
      return res.status(404).json({ message: "Scrim not found" });
    }

    // only the teamA owner or a manager can see requests
    const isOwner = scrim.teamA.owner.toString() === req.user.id;
    const isManager = scrim.teamA.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    const payload = scrim.toObject();
    if (!isOwner && !isManager) {
      delete payload.requests; // hide from everyone else
    }

    res.json(payload);
  } catch (err) {
    console.error("🔥 Scrim-fetch Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @desc    Update a scrim's format or time (owner/manager only)
 * @route   PUT /api/scrims/:scrimId
 * @access  Private
 */
router.put("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { format, scheduledTime } = req.body;
  if (!mongoose.Types.ObjectId.isValid(scrimId)) {
    return res.status(400).json({ message: "Invalid scrim ID format" });
  }
  try {
    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    // Check owner/manager
    const team = await Team.findById(scrim.teamA);
    const isOwner = team.owner.toString() === req.user.id;
    const isManager = team.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res
        .status(403)
        .json({ message: "Only the owner or a manager can edit this scrim" });
    }

    if (format) scrim.format = format;
    if (scheduledTime) scrim.scheduledTime = new Date(scheduledTime);
    const updated = await scrim.save();
    res.json(updated);
  } catch (error) {
    console.error("🔥 Scrim-update Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc    Delete a scrim (owner/manager only) with cascade cleanup
 * @route   DELETE /api/scrims/:scrimId
 * @access  Private
 */
router.delete("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;

  // 1. Validate ID format
  if (!mongoose.Types.ObjectId.isValid(scrimId)) {
    return res.status(400).json({ message: "Invalid scrim ID format" });
  }

  try {
    // 2. Fetch the scrim
    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({ message: "Scrim not found" });
    }

    // 3. Permission check
    const team = await Team.findById(scrim.teamA);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    const isOwner = team.owner.toString() === req.user.id;
    const isManager = team.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res
        .status(403)
        .json({ message: "Only the owner or a manager can delete this scrim" });
    }

    console.log(`🗑️ Starting cascade delete for scrim ${scrimId}`);

    // 4. CASCADE DELETE: Find and delete related chat
    const chat = await ScrimChat.findOne({ scrim: scrimId });
    if (chat) {
      console.log(`🗑️ Deleting chat ${chat._id} for scrim ${scrimId}`);
      await ScrimChat.findByIdAndDelete(chat._id);

      // Emit Socket.IO event to notify users that chat is no longer available
      const io = req.app.get("io");
      if (io) {
        io.to(chat._id.toString()).emit("chatDeleted", {
          message: "This scrim has been deleted by the organizer",
        });
      }
    }

    // 5. CASCADE DELETE: Delete related notifications
    const deletedNotifications = await Notification.deleteMany({
      scrim: scrimId,
    });
    console.log(
      `🗑️ Deleted ${deletedNotifications.deletedCount} notifications for scrim ${scrimId}`
    );

    // 6. Delete the scrim itself
    await Scrim.findByIdAndDelete(scrimId);
    console.log(`🗑️ Deleted scrim ${scrimId}`);

    // 7. Emit Socket.IO event for real-time UI updates
    const io = req.app.get("io");
    if (io) {
      // Notify all relevant teams that the scrim was deleted
      const allTeams = [
        scrim.teamA.toString(),
        ...(Array.isArray(scrim.requests)
          ? scrim.requests.map((id) => id.toString())
          : []),
        ...(scrim.teamB ? [scrim.teamB.toString()] : []),
      ];

      allTeams.forEach((teamId) => {
        io.emit("scrimDeleted", {
          teamId: teamId,
          scrimId: scrimId,
          message: `Scrim deleted by ${team.name}`,
        });
      });
    }

    // 8. Success response
    return res.json({
      message: "Scrim and related data removed successfully",
      details: {
        scrimDeleted: true,
        chatDeleted: !!chat,
        notificationsDeleted: deletedNotifications.deletedCount,
      },
    });
  } catch (error) {
    console.error("🔥 Scrim cascade delete Error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Server error", error: error.stack });
  }
});

/**
 * @desc    Owner/manager accepts a pending scrim request
 * @route   PUT /api/scrims/accept/:scrimId
 * @access  Private
 */
router.put("/accept/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { teamId } = req.body;

  // 1) Validate IDs
  if (
    !mongoose.Types.ObjectId.isValid(scrimId) ||
    !mongoose.Types.ObjectId.isValid(teamId)
  ) {
    return res.status(400).json({ message: "Invalid scrimId or teamId" });
  }

  try {
    // 2) Load scrim & verify it's open
    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });
    if (scrim.status !== "open") {
      return res
        .status(400)
        .json({ message: "Scrim is not open for accepting requests" });
    }

    // 3) Load both teams
    const postingTeam = await Team.findById(scrim.teamA);
    const requestingTeam = await Team.findById(teamId);
    if (!postingTeam || !requestingTeam) {
      return res.status(404).json({ message: "Team not found" });
    }

    const isOwner = postingTeam.owner.toString() === req.user.id;
    const isManager = postingTeam.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res
        .status(403)
        .json({ message: "Only the owner or a manager can accept this scrim" });
    }

    // 4) Ensure the requesting team actually asked
    if (!scrim.requests.includes(teamId)) {
      return res
        .status(400)
        .json({ message: "That team did not request this scrim" });
    }

    // 5) Move teamId → teamB, clear requests, mark booked
    scrim.teamB = teamId;
    scrim.status = "booked";
    scrim.requests = [];
    await scrim.save();

    // 6) Ensure chat thread exists and is fully saved
    let chat = await ScrimChat.findOne({ scrim: scrim._id });
    if (!chat) {
      chat = new ScrimChat({ scrim: scrim._id, messages: [] });
      await chat.save();
      console.log(`💬 Created new chat for scrim ${scrim._id}:`, chat._id);
    } else {
      console.log(`💬 Chat already exists for scrim ${scrim._id}:`, chat._id);
    }

    // 7) Notify challenging team
    const acceptNotification = await Notification.create({
      team: teamId,
      scrim: scrim._id,
      chat: chat._id,
      message: `${postingTeam.name} accepted your scrim request`,
      type: "accept",
      // url: "/chats", // ← REMOVED: No redirection for accept notifications
    });

    const feedbackNotification = await Notification.create({
      team: scrim.teamA,
      scrim: scrim._id,
      chat: chat._id,
      message: `You accepted ${requestingTeam.name}'s request`,
      type: "accept-feedback",
      // url: "/chats", // ← REMOVED: No redirection for feedback notifications
    });

    // 🚨 EMIT SOCKET EVENTS
    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: teamId, // Notify the requesting team
        notification: acceptNotification,
      });
      io.emit("newNotification", {
        teamId: scrim.teamA, // Notify the accepting team
        notification: feedbackNotification,
      });
      console.log(
        `🔔 Emitted accept notifications to teams ${teamId} and ${scrim.teamA}`
      );
    }

    return res.json({ message: "Scrim request accepted", scrim });
  } catch (error) {
    console.error("🔥 Scrim-accept Error:", error.stack);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

/**
 * @desc    Owner/manager declines a pending scrim request
 * @route   PUT /api/scrims/decline/:scrimId
 * @access  Private
 */
router.put("/decline/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { teamId } = req.body;

  // 1) Validate IDs
  if (
    !mongoose.Types.ObjectId.isValid(scrimId) ||
    !mongoose.Types.ObjectId.isValid(teamId)
  ) {
    return res.status(400).json({ message: "Invalid scrimId or teamId" });
  }

  try {
    // 2) Load scrim
    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    // 3) Permission check on teamA
    const team = await Team.findById(scrim.teamA);
    if (!team) return res.status(404).json({ message: "Team not found" });
    const isOwner = team.owner.toString() === req.user.id;
    const isManager = team.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res.status(403).json({
        message: "Only the owner or a manager can decline this scrim",
      });
    }

    // 4) Ensure the team had requested
    if (!scrim.requests.includes(teamId)) {
      return res
        .status(400)
        .json({ message: "That team did not request this scrim" });
    }

    // 5) Remove request & save
    scrim.requests = scrim.requests.filter((id) => id.toString() !== teamId);
    await scrim.save();

    // 6) Ensure chat thread exists (for notification)
    let chat = await ScrimChat.findOne({ scrim: scrim._id });
    if (!chat) {
      chat = new ScrimChat({ scrim: scrim._id, messages: [] });
      await chat.save();
    }

    // 7) Notify the declined team
    const notification = await Notification.create({
      team: teamId,
      scrim: scrim._id,
      chat: chat._id,
      message: `${team.name} declined your scrim request`,
      type: "decline",
      url: "/chats",
    });

    // 🚨 EMIT SOCKET EVENT
    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: teamId, // Only notify the declined team
        notification: notification,
      });
      console.log(`🔔 Emitted decline notification to team ${teamId}`);
    }

    return res.json({ message: "Scrim request declined", scrim });
  } catch (error) {
    console.error("🔥 Scrim-decline Error:", error.stack);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

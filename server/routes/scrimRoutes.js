const express = require("express");
const mongoose = require("mongoose");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const Game = require("../models/Game");
const Notification = require("../models/Notification");
const ScrimChat = require("../models/ScrimChat");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// List ALL scrims, with optional ?game, ?server, ?rank filters
router.get("/", protect, async (req, res) => {
  try {
    const { game, server, rank } = req.query;

    // 1) Grab every scrim (we’ll filter in JS)
    const scrims = await Scrim.find({})
      .populate("teamA", "name game server rank")
      .populate("teamB", "name")
      .populate("requests", "_id")
      .sort({ scheduledTime: 1 });

    // 2) Filter based on the actual Team fields you populated
    const filteredScrims = scrims.filter((s) => {
      if (game && s.teamA?.game !== game) return false;
      if (server && s.teamA?.server !== server) return false;
      if (rank && s.teamA?.rank !== rank) return false;
      return true;
    });

    return res.json(filteredScrims);
  } catch (err) {
    console.error("🔥 Error listing scrims:", err);
    return res.status(500).json({ message: "Server error" });
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
 * @desc    Get a single scrim’s details (requests visible only to owner/managers)
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
      .populate("teamA", "name owner members game")
      .populate("teamB", "name")
      .populate("requests", "name");
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    // Only teamA owner or manager can see the requests array
    const isOwner = scrim.teamA.owner.toString() === req.user.id;
    const isManager = scrim.teamA.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    const payload = scrim.toObject();
    if (!isOwner && !isManager) {
      delete payload.requests;
    }

    return res.json(payload);
  } catch (err) {
    console.error("🔥 Scrim-detail Error:", err);
    return res.status(500).json({ message: "Server error" });
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
    let chat = await ScrimChat.findOne({
      scrim: scrim._id,
      challenger: teamId,
    });
    if (!chat) {
      chat = await ScrimChat.create({
        scrim,
        owner: scrim.teamA,
        challenger: teamId,
        messages: [],
      });
    }

    await Notification.create({
      team: scrim.teamA,
      scrim: scrim._id,
      chat: chat._id,
      message: `${requestingTeam.name} requested your scrim`,
      type: "request",
      url: `/scrims/${scrim._id}/requests`,
    });

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
 * @desc    Delete a scrim (owner/manager only)
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

    // 4. Delete via model method
    await Scrim.findByIdAndDelete(scrimId);

    // 5. Success response
    return res.json({ message: "Scrim removed" });
  } catch (error) {
    console.error("🔥 Scrim-delete Error:", error);
    // Return the actual error message (and stack if you like) for debugging
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
    // 2) Load scrim & verify it’s open
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

    // 6) Ensure chat thread exists
    let chat = await ScrimChat.findOne({ scrim: scrim._id });
    if (!chat) {
      chat = new ScrimChat({ scrim: scrim._id, messages: [] });
      await chat.save();
    }

    // 7) Notify challenging team
    await Notification.create({
      team: teamId,
      scrim: scrim._id,
      chat: chat._id,
      message: `${postingTeam.name} accepted your scrim request`,
      type: "accept",
      url: "/chats",
    });

    await Notification.create({
      team: scrim.teamA,
      scrim: scrim._id,
      chat: chat._id,
      message: `You accepted ${requestingTeam.name}'s request`,
      type: "accept-feedback",
      url: "/chats",
    });

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
    await Notification.create({
      team: teamId,
      scrim: scrim._id,
      chat: chat._id,
      message: `${team.name} declined your scrim request`,
      type: "decline",
      url: "/chats",
    });

    return res.json({ message: "Scrim request declined", scrim });
  } catch (error) {
    console.error("🔥 Scrim-decline Error:", error.stack);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

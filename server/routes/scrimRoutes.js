const express = require("express");
const mongoose = require("mongoose");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const Game = require("../models/Game");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/scrims
 * List all scrims (open and booked), with teamA and teamB names
 */
router.get("/", protect, async (req, res) => {
  try {
    const scrims = await Scrim.find()
      .populate("teamA", "name")
      .populate("teamB", "name")
      .select("format scheduledTime status teamA teamB");
    res.json(scrims);
  } catch (err) {
    console.error("🔥 List scrims Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/scrims
 * Create a new scrim (owner or manager)
 */
router.post("/", protect, async (req, res) => {
  const { teamId, format, scheduledTime } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID format" });
    }
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isOwner = team.owner.toString() === req.user.id;
    const isManager = team.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res
        .status(403)
        .json({ message: "Only the owner or a manager can create a scrim" });
    }

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
    if (!gameDoc.formats.includes(format)) {
      return res
        .status(400)
        .json({ message: `Invalid format for ${gameDoc.name}` });
    }

    const scrim = await Scrim.create({
      teamA: team._id,
      format,
      scheduledTime: new Date(scheduledTime).toISOString(),
      status: "open",
    });

    res.status(201).json(scrim);
  } catch (error) {
    console.error("🔥 Scrim-create Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * POST /api/scrims/request/:scrimId
 * Send a request to join a scrim
 */
router.post("/request/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    const { teamId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID format" });
    }
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (scrim.teamA.toString() === teamId) {
      return res
        .status(400)
        .json({ message: "You cannot request your own scrim" });
    }
    if (scrim.requests.includes(teamId)) {
      return res.status(400).json({ message: "Scrim request already sent" });
    }

    scrim.requests.push(teamId);
    await scrim.save();

    const ScrimChat = require("../models/ScrimChat");
    let chat = await ScrimChat.findOne({ scrim: scrim._id });
    if (!chat) {
      chat = new ScrimChat({ scrim: scrim._id, messages: [] });
      await chat.save();
    }

    await Notification.create({
      team: scrim.teamA,
      scrim: scrim._id,
      message: `${team.name} requested your scrim`,
      type: "request",
    });

    res.json({ message: "Scrim request sent", scrim });
  } catch (error) {
    console.error("🔥 Scrim-request Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * GET /api/scrims/:scrimId
 * Fetch a single scrim (owner/manager sees requests)
 */
router.get("/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId)
      .populate("teamA", "name rank owner members game")
      .populate("teamB", "name rank")
      .populate("requests", "name rank");
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    const isOwner = scrim.teamA.owner.toString() === req.user.id;
    const isManager = scrim.teamA.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    const scrimObj = scrim.toObject();
    if (!isOwner && !isManager) delete scrimObj.requests;

    res.json(scrimObj);
  } catch (error) {
    console.error("🔥 Scrim-fetch Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * PUT /api/scrims/:scrimId
 * Update a scrim's format or scheduledTime
 */
router.put("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { format, scheduledTime } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(scrimId)) {
      return res.status(400).json({ message: "Invalid scrim ID format" });
    }
    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    const team = await Team.findById(scrim.teamA);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isOwner = team.owner.toString() === req.user.id;
    const isManager = team.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res
        .status(403)
        .json({ message: "Only the owner or a manager can edit this scrim" });
    }

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
    if (!gameDoc.formats.includes(format)) {
      return res
        .status(400)
        .json({ message: `Invalid format for ${gameDoc.name}` });
    }

    scrim.format = format;
    scrim.scheduledTime = new Date(scheduledTime);
    await scrim.save();

    res.json(scrim);
  } catch (error) {
    console.error("🔥 Scrim-update Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * PUT /api/scrims/accept/:scrimId
 * Owner/manager accepts a pending scrim request
 */
router.put("/accept/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    const team = await Team.findById(scrim.teamA);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isOwner = team.owner.toString() === req.user.id;
    const isManager = team.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res
        .status(403)
        .json({ message: "Only the owner or a manager can accept this scrim" });
    }

    const { teamId } = req.body;
    if (!scrim.requests.includes(teamId)) {
      return res
        .status(400)
        .json({ message: "This team did not request to join the scrim" });
    }

    scrim.teamB = teamId;
    scrim.status = "booked";
    scrim.requests = [];
    await scrim.save();

    await Notification.create({
      team: teamId,
      scrim: scrim._id,
      message: `${team.name} accepted your scrim request`,
      type: "accept",
    });

    res.json({ message: "Scrim booked", scrim });
  } catch (error) {
    console.error("🔥 Scrim-accept Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * PUT /api/scrims/decline/:scrimId
 * Owner/manager declines a pending scrim request
 */
router.put("/decline/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    const team = await Team.findById(scrim.teamA);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isOwner = team.owner.toString() === req.user.id;
    const isManager = team.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    if (!isOwner && !isManager) {
      return res
        .status(403)
        .json({
          message: "Only the owner or a manager can decline this scrim request",
        });
    }

    const { teamId } = req.body;
    if (!scrim.requests.includes(teamId)) {
      return res
        .status(400)
        .json({ message: "This team did not request to join the scrim" });
    }

    scrim.requests = scrim.requests.filter((id) => id.toString() !== teamId);
    await scrim.save();

    await Notification.create({
      team: teamId,
      scrim: scrim._id,
      message: `${team.name} declined your scrim request`,
      type: "decline",
    });

    res.json({ message: "Scrim request declined", scrim });
  } catch (error) {
    console.error("🔥 Scrim-decline Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

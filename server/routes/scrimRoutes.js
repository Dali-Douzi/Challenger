const express = require("express");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const Game = require("../models/Game");
const { protect } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const router = express.Router();

// Create a new scrim (owner or manager)
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
      return res.status(403).json({
        message: "Only the team owner or a manager can create a scrim",
      });
    }

    const gameDoc = await Game.findById(team.game).select("formats name");
    if (!gameDoc) return res.status(404).json({ message: "Game not found" });
    const validFormats = gameDoc.formats;
    if (!validFormats.includes(format)) {
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
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// List open scrims for a specific team (match by game + rank)
router.get("/team/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    const scrims = await Scrim.find({ status: "open" })
      .populate({
        path: "teamA",
        select: "name rank",
        match: { game: team.game, rank: team.rank },
      })
      .select("format scheduledTime teamA");
    res.json(scrims.filter((scrim) => scrim.teamA));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send a scrim request (cannot request own scrim or duplicate)
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
    res.json({ message: "Scrim request sent", scrim });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Fetch a specific scrim's details (requests visible only to owner or manager)
router.get("/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId)
      .populate("teamA", "name rank owner members")
      .populate("teamB", "name rank")
      .populate("requests", "name rank");
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    const isOwner = scrim.teamA.owner.toString() === req.user.id;
    const isManager = scrim.teamA.members.some(
      (m) => m.user.toString() === req.user.id && m.role === "manager"
    );
    const scrimObj = scrim.toObject();
    if (!isOwner && !isManager) {
      delete scrimObj.requests;
    }

    res.json(scrimObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Accept a requesting team and book the scrim (owner or manager)
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
      return res.status(403).json({
        message: "Only the team owner or a manager can accept a scrim request",
      });
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
    res.json({ message: "Scrim confirmed with selected team", scrim });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

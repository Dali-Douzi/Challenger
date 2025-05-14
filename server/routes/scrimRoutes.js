const express = require("express");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const { protect } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const router = express.Router();

/**
 * 🟢 1. Create a Scrim (Only Team Managers)
 */
router.post("/", protect, async (req, res) => {
  const { teamId, format, scheduledTime } = req.body;

  try {
    // ✅ Validate that teamId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID format" });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the team owner can create a scrim" });
    }

    const validFormats = ["Best of 1", "Best of 3", "Best of 5", "Best of 7"];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ message: "Invalid format selection" });
    }

    // Convert the incoming scheduledTime to UTC
    const utcScheduledTime = new Date(scheduledTime).toISOString();

    const scrim = await Scrim.create({
      teamA: team._id,
      format,
      scheduledTime: utcScheduledTime, // Store in UTC
      status: "open",
    });

    res.status(201).json(scrim);
  } catch (error) {
    console.error("Create Scrim Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * 🔵 2. Get Scrims (Filtered by User’s Team Game)
 */
router.get("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // ✅ Only show scrims for teams that play the same game
    const scrims = await Scrim.find({ status: "open" })
      .populate({
        path: "teamA",
        select: "name rank", // ✅ Show only team name & rank
        match: { game: team.game }, // ✅ Filter by same game
      })
      .select("format scheduledTime");

    // Remove any null results (teams that don't match the game filter)
    const filteredScrims = scrims.filter((scrim) => scrim.teamA !== null);

    res.json(filteredScrims);
  } catch (error) {
    console.error("Fetch Scrims Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * 🟡 3. Send a Scrim Request
 */
router.post("/request/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    const { teamId } = req.body;
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
    console.error("Scrim Request Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * 🟢 Get a Specific Scrim (Including Requests)
 */
router.get("/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId)
      .populate("teamA", "name rank") // ✅ Show Team A's name & rank
      .populate("teamB", "name rank") // ✅ Show Team B if booked
      .populate("requests", "name rank"); // ✅ Show names & ranks of requesting teams

    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    res.json(scrim);
  } catch (error) {
    console.error("Fetch Scrim Details Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * 🟠 4. Confirm a Scrim Request
 */
router.put("/confirm/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    if (scrim.status !== "open") {
      return res.status(400).json({ message: "Scrim is no longer available" });
    }

    const { teamId } = req.body;
    if (!scrim.requests.includes(teamId)) {
      return res
        .status(400)
        .json({ message: "Team did not request this scrim" });
    }

    scrim.teamB = teamId;
    scrim.status = "booked";
    scrim.requests = [];
    await scrim.save();

    res.json({ message: "Scrim confirmed", scrim });
  } catch (error) {
    console.error("Confirm Scrim Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * 🟢 Accept a Scrim Request (Team A Chooses an Opponent)
 */
router.put("/accept/:scrimId", protect, async (req, res) => {
  try {
    const scrim = await Scrim.findById(req.params.scrimId);
    if (!scrim) return res.status(404).json({ message: "Scrim not found" });

    // Only the team that created the scrim can accept a request
    if (scrim.teamA.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the scrim creator can accept a request" });
    }

    const { teamId } = req.body;
    if (!scrim.requests.includes(teamId)) {
      return res
        .status(400)
        .json({ message: "This team did not request to join the scrim" });
    }

    scrim.teamB = teamId;
    scrim.status = "booked";
    scrim.requests = []; // Clear requests since scrim is now confirmed
    await scrim.save();

    res.json({ message: "Scrim confirmed with selected team", scrim });
  } catch (error) {
    console.error("Accept Scrim Request Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

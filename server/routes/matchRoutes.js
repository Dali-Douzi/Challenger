const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const Tournament = require("../models/Tournament");
const {
  protect,
  isRefereeOrOrganizer,
} = require("../middleware/authMiddleware");

// --- Get one match ---
// GET /matches/:id
router.get("/:id", protect, isRefereeOrOrganizer, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winner", "name");
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Update match details & scores with next‐round cascade ---
// PUT /matches/:id
router.put("/:id", protect, isRefereeOrOrganizer, async (req, res) => {
  try {
    const { scheduledAt, format, scoreA, scoreB } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });

    // Update scheduling and format
    if (scheduledAt) {
      match.scheduledAt = new Date(scheduledAt);
      match.status = "SCHEDULED";
    }
    if (format !== undefined) {
      match.format = format;
    }

    // Update scores
    if (scoreA !== undefined) match.scoreA = scoreA;
    if (scoreB !== undefined) match.scoreB = scoreB;

    // Determine winner if both scores set
    if (match.scoreA !== null && match.scoreB !== null) {
      match.winner = match.scoreA > match.scoreB ? match.teamA : match.teamB;
      match.status = "COMPLETED";

      // --- Next‐round cascade logic for SINGLE_ELIM brackets ---
      const tourney = await Tournament.findById(match.tournament);
      const nextPhaseIndex = match.phaseIndex + 1;
      const nextPhase = tourney.phases[nextPhaseIndex];
      if (nextPhase?.bracketType === "SINGLE_ELIM") {
        const nextSlot = Math.ceil(match.slot / 2);
        const update = {};
        if (match.slot % 2 === 1) {
          update.teamA = match.winner;
        } else {
          update.teamB = match.winner;
        }
        await Match.findOneAndUpdate(
          {
            tournament: match.tournament,
            phaseIndex: nextPhaseIndex,
            slot: nextSlot,
          },
          update,
          { new: true }
        );
      }
      // (for ROUND_ROBIN or DOUBLE_ELIM, add logic later if needed)
    }

    await match.save();
    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- List matches by tournament & phase ---
// GET /matches?tournament=<tourneyId>&phase=<phaseIndex>
router.get("/", async (req, res) => {
  try {
    const { tournament, phase } = req.query;
    if (!tournament || phase === undefined) {
      return res
        .status(400)
        .json({ message: "tournament and phase query params required" });
    }
    const matches = await Match.find({
      tournament,
      phaseIndex: Number(phase),
    })
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winner", "name")
      .sort("slot");
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

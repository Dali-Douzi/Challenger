const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const Tournament = require("../models/Tournament");
const {
  protect,
  isRefereeOrOrganizer,
} = require("../middleware/authMiddleware");

router.get("/:id", protect, async (req, res) => {
  try {
    
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("Invalid ObjectId format:", req.params.id);
      return res.status(400).json({ message: "Invalid match ID format" });
    }
    
    const match = await Match.findById(req.params.id)
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winner", "name");
    
    const tournament = await Tournament.findById(match.tournament)
      .populate("organizer", "_id")
      .populate("referees", "_id");
    
    if (!tournament) {
      console.log("Tournament not found for match:", match.tournament);
      return res.status(404).json({ message: "Tournament not found for this match" });
    }
    
    const isOrganizer = tournament.organizer._id.toString() === req.user.id;
    const isReferee = tournament.referees.some(ref => ref._id.toString() === req.user.id);
    
    console.log("Permission check:", { 
      isOrganizer, 
      isReferee,
      tournamentId: tournament._id,
      organizerId: tournament.organizer._id,
      currentUserId: req.user.id
    });
    
    if (!isOrganizer && !isReferee) {
      return res.status(403).json({ message: "Access denied. Only organizers and referees can view match details." });
    }
    
    console.log("=== MATCH FETCH SUCCESS ===");
    res.json(match);
  } catch (err) {
    console.error("=== MATCH FETCH ERROR ===");
    console.error("Error fetching match:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    
    const { scheduledAt, format, scoreA, scoreB } = req.body;
    
    const match = await Match.findById(req.params.id);
    if (!match) {
      console.log("Match not found for update:", req.params.id);
      return res.status(404).json({ message: "Match not found" });
    }
    
    console.log("Found match for update:", {
      _id: match._id,
      tournament: match.tournament,
      slot: match.slot,
      phaseIndex: match.phaseIndex
    });

    const tournament = await Tournament.findById(match.tournament)
      .populate("organizer", "_id")
      .populate("referees", "_id");
    
    if (!tournament) {
      console.log("Tournament not found for match update:", match.tournament);
      return res.status(404).json({ message: "Tournament not found for this match" });
    }
    
    const isOrganizer = tournament.organizer._id.toString() === req.user.id;
    const isReferee = tournament.referees.some(ref => ref._id.toString() === req.user.id);
    
    console.log("Update permission check:", { 
      isOrganizer, 
      isReferee,
      tournamentId: tournament._id,
      organizerId: tournament.organizer._id,
      currentUserId: req.user.id
    });
    
    if (!isOrganizer && !isReferee) {
      return res.status(403).json({ message: "Access denied. Only organizers and referees can update matches." });
    }

    if (scheduledAt) {
      match.scheduledAt = new Date(scheduledAt);
      match.status = "SCHEDULED";
    }
    if (format !== undefined) {
      match.format = format;
    }

    if (scoreA !== undefined) match.scoreA = scoreA;
    if (scoreB !== undefined) match.scoreB = scoreB;

    if (match.scoreA !== null && match.scoreB !== null) {
      match.winner = match.scoreA > match.scoreB ? match.teamA : match.teamB;
      match.status = "COMPLETED";

      const nextPhaseIndex = match.phaseIndex + 1;
      const nextPhase = tournament.phases[nextPhaseIndex];
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
    }

    await match.save();
    
    const updatedMatch = await Match.findById(match._id)
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate("winner", "name");
    
    console.log("=== MATCH UPDATE SUCCESS ===");
    console.log("Updated match:", updatedMatch);
    
    res.json(updatedMatch);
  } catch (err) {
    console.error("=== MATCH UPDATE ERROR ===");
    console.error("Error updating match:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

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
    console.error("Error fetching matches:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
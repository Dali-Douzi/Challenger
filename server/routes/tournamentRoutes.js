const express = require("express");
const router = express.Router();
const Tournament = require("../models/Tournament");
const Match = require("../models/Match");
const Team = require("../models/Team");
const protect = require("../middleware/authMiddleware");

async function isOrganizer(req, res, next) {
  const tourney = await Tournament.findById(req.params.id);
  if (!tourney)
    return res.status(404).json({ message: "Tournament not found" });
  if (tourney.organizer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Organizer only" });
  }
  next();
}

function validateStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    REGISTRATION_OPEN: ["REGISTRATION_LOCKED"],
    REGISTRATION_LOCKED: ["BRACKET_LOCKED", "REGISTRATION_OPEN"],
    BRACKET_LOCKED: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETE"],
    COMPLETE: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

function validateTournamentReadiness(tournament, targetStatus) {
  const teamCount = tournament.teams?.length || 0;

  switch (targetStatus) {
    case "REGISTRATION_LOCKED":
      if (teamCount < 2) {
        return {
          valid: false,
          message: "Need at least 2 teams to close registration",
        };
      }
      break;

    case "BRACKET_LOCKED":
      if (teamCount < 2) {
        return {
          valid: false,
          message: "Need at least 2 teams to lock bracket",
        };
      }
      if (tournament.status !== "REGISTRATION_LOCKED") {
        return { valid: false, message: "Must close registration first" };
      }
      break;

    case "IN_PROGRESS":
      if (tournament.status !== "BRACKET_LOCKED") {
        return { valid: false, message: "Must lock bracket first" };
      }
      break;

    case "COMPLETE":
      if (tournament.status !== "IN_PROGRESS") {
        return {
          valid: false,
          message: "Tournament must be in progress to complete",
        };
      }
      break;
  }

  return { valid: true };
}

async function generateUniqueCode() {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (await Tournament.exists({ refereeCode: code }));
  return code;
}

function nextPowerOfTwo(n) {
  return 2 ** Math.ceil(Math.log2(n));
}

function makeBracketTemplate(teamsCount, bracketType) {
  switch (bracketType) {
    case "SINGLE_ELIM": {
      const slots = nextPowerOfTwo(teamsCount);
      return Array.from({ length: slots / 2 }, (_, i) => ({
        slot: i + 1,
        teamA: null,
        teamB: null,
        stage: "winner",
      }));
    }
    case "ROUND_ROBIN": {
      const list = [];
      let slot = 1;
      for (let i = 0; i < teamsCount; i++) {
        for (let j = i + 1; j < teamsCount; j++) {
          list.push({
            slot: slot++,
            teamA: null,
            teamB: null,
            stage: "roundrobin",
          });
        }
      }
      return list;
    }
    case "DOUBLE_ELIM": {
      const slots = nextPowerOfTwo(teamsCount);
      const winnerMatches = Array.from({ length: slots / 2 }, (_, i) => ({
        slot: i + 1,
        teamA: null,
        teamB: null,
        stage: "winner",
      }));
      const loserMatches = Array.from({ length: slots - 1 }, (_, i) => ({
        slot: i + 1,
        teamA: null,
        teamB: null,
        stage: "loser",
      }));
      return [...winnerMatches, ...loserMatches];
    }
    default:
      return [];
  }
}

router.get("/", protect, async (req, res) => {
  try {
    const tours = await Tournament.find()
      .sort({ createdAt: -1 })
      .select("name description status createdAt startDate game");
    res.json(tours);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/code/:code", protect, async (req, res) => {
  try {
    const tourney = await Tournament.findOne({ refereeCode: req.params.code });
    if (!tourney)
      return res.status(404).json({ message: "Invalid referee code" });
    res.json({ _id: tourney._id, name: tourney.name });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id)
      .populate("teams", "name")
      .populate("pendingTeams", "name")
      .populate("referees", "username")
      .populate("organizer", "username");
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });

    const obj = tourney.toObject();
    obj.isOrganizer = tourney.organizer._id.toString() === req.user.id;
    obj.isReferee = tourney.referees.some(
      (r) => r._id.toString() === req.user.id
    );

    const userTeams = await Team.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    }).select("_id");
    const myIds = userTeams.map((t) => t._id.toString());
    const pending = tourney.pendingTeams.find((t) =>
      myIds.includes(t._id.toString())
    );
    const approved = tourney.teams.find((t) =>
      myIds.includes(t._id.toString())
    );
    obj.myTeamId = (pending || approved)?._id || null;
    obj.isTeamApproved = Boolean(approved);

    res.json(obj);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id/bracket-template/:phaseIndex", protect, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });

    const userId = req.user.id;
    const isOrganizer = tourney.organizer.toString() === userId;
    const isReferee = tourney.referees.some((r) => r.toString() === userId);

    if (!isOrganizer && !isReferee) {
      return res.status(403).json({ message: "Access denied" });
    }

    const idx = Number(req.params.phaseIndex);
    const phase = tourney.phases[idx];
    if (!phase) return res.status(400).json({ message: "Invalid phase index" });
    const template = makeBracketTemplate(
      tourney.teams.length,
      phase.bracketType
    );
    res.json(template);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { name, description, startDate, game, maxParticipants, phases } =
      req.body;
    if (
      !name ||
      !description ||
      !startDate ||
      !game ||
      !maxParticipants ||
      !phases?.length
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (maxParticipants < 2) {
      return res
        .status(400)
        .json({ message: "Tournament must allow at least 2 participants" });
    }

    const refereeCode = await generateUniqueCode();
    const newTourney = new Tournament({
      name,
      description,
      startDate,
      game,
      maxParticipants,
      phases,
      organizer: req.user.id,
      refereeCode,
    });
    const saved = await newTourney.save();
    res.status(201).json(saved);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", protect, isOrganizer, async (req, res) => {
  try {
    const { name, description, startDate } = req.body;

    if (!name || !description || !startDate) {
      return res
        .status(400)
        .json({ message: "Name, description, and start date are required" });
    }

    const startDateObj = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj < today) {
      return res
        .status(400)
        .json({ message: "Start date cannot be in the past" });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    tournament.name = name.trim();
    tournament.description = description.trim();
    tournament.startDate = startDate;

    await tournament.save();

    console.log("Tournament basic info updated:", tournament._id);
    res.json(tournament);
  } catch (err) {
    console.error("Error updating tournament:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put(
  "/:id/lock-registrations",
  protect,
  isOrganizer,
  async (req, res) => {
    try {
      const tourney = await Tournament.findById(req.params.id);
      if (!tourney)
        return res.status(404).json({ message: "Tournament not found" });

      if (!validateStatusTransition(tourney.status, "REGISTRATION_LOCKED")) {
        return res.status(400).json({
          message: `Cannot lock registrations from status: ${tourney.status}`,
        });
      }

      const validation = validateTournamentReadiness(
        tourney,
        "REGISTRATION_LOCKED"
      );
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }

      const updated = await Tournament.findByIdAndUpdate(
        req.params.id,
        { status: "REGISTRATION_LOCKED" },
        { new: true }
      );
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.put("/:id/lock-bracket", protect, isOrganizer, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });

    if (!validateStatusTransition(tourney.status, "BRACKET_LOCKED")) {
      return res.status(400).json({
        message: `Cannot lock bracket from status: ${tourney.status}`,
      });
    }

    const validation = validateTournamentReadiness(tourney, "BRACKET_LOCKED");
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    tourney.status = "BRACKET_LOCKED";
    await tourney.save();

    await Match.deleteMany({ tournament: req.params.id });
    for (let idx = 0; idx < tourney.phases.length; idx++) {
      const phase = tourney.phases[idx];
      const template = makeBracketTemplate(
        tourney.teams.length,
        phase.bracketType
      );
      const docs = template.map((m) => ({
        tournament: tourney._id,
        phaseIndex: idx,
        slot: m.slot,
        teamA: m.teamA,
        teamB: m.teamB,
      }));
      await Match.insertMany(docs);
    }

    res.json(tourney);
  } catch (err) {
    console.error("Error locking bracket:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/start", protect, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });

    const userId = req.user.id;
    const isOrganizer = tourney.organizer.toString() === userId;
    const isReferee = tourney.referees.some((r) => r.toString() === userId);

    if (!isOrganizer && !isReferee) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!validateStatusTransition(tourney.status, "IN_PROGRESS")) {
      return res.status(400).json({
        message: `Cannot start tournament from status: ${tourney.status}`,
      });
    }

    const validation = validateTournamentReadiness(tourney, "IN_PROGRESS");
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const updated = await Tournament.findByIdAndUpdate(
      req.params.id,
      { status: "IN_PROGRESS" },
      { new: true }
    );
    res.json(updated);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/complete", protect, isOrganizer, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });

    if (!validateStatusTransition(tourney.status, "COMPLETE")) {
      return res.status(400).json({
        message: `Cannot complete tournament from status: ${tourney.status}`,
      });
    }

    const validation = validateTournamentReadiness(tourney, "COMPLETE");
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const updated = await Tournament.findByIdAndUpdate(
      req.params.id,
      { status: "COMPLETE" },
      { new: true }
    );
    res.json(updated);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", protect, isOrganizer, async (req, res) => {
  try {
    await Match.deleteMany({ tournament: req.params.id });
    await Tournament.findByIdAndDelete(req.params.id);
    res.json({ message: "Tournament cancelled" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/referees", protect, async (req, res) => {
  try {
    const { code } = req.body;
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });
    if (tourney.refereeCode !== code) {
      return res.status(400).json({ message: "Invalid referee code" });
    }
    if (!tourney.referees.includes(req.user.id)) {
      tourney.referees.push(req.user.id);
      await tourney.save();
    }
    res.json({ message: "Added as referee" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id/referees/:uid", protect, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (
      tourney.organizer.toString() !== req.user.id &&
      req.params.uid !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }
    tourney.referees = tourney.referees.filter(
      (r) => r.toString() !== req.params.uid
    );
    await tourney.save();
    res.json({ message: "Referee removed" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/teams", protect, async (req, res) => {
  try {
    const { teamId } = req.body;
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });

    if (tourney.status !== "REGISTRATION_OPEN") {
      return res
        .status(400)
        .json({ message: "Registration is closed for this tournament" });
    }

    if (tourney.teams.length >= tourney.maxParticipants) {
      return res.status(400).json({ message: "Tournament is full" });
    }

    if (
      tourney.pendingTeams.includes(teamId) ||
      tourney.teams.includes(teamId)
    ) {
      return res.status(400).json({ message: "Already requested or joined" });
    }
    tourney.pendingTeams.push(teamId);
    await tourney.save();
    res.json({ message: "Request submitted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id/teams/pending", protect, isOrganizer, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id).populate(
      "pendingTeams",
      "name"
    );
    res.json(tourney.pendingTeams);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.put(
  "/:id/teams/:tid/approve",
  protect,
  isOrganizer,
  async (req, res) => {
    try {
      const tourney = await Tournament.findById(req.params.id);
      if (!tourney)
        return res.status(404).json({ message: "Tournament not found" });

      if (tourney.status !== "REGISTRATION_OPEN") {
        return res
          .status(400)
          .json({ message: "Cannot approve teams - registration is closed" });
      }

      if (tourney.teams.length >= tourney.maxParticipants) {
        return res
          .status(400)
          .json({ message: "Cannot approve - tournament is full" });
      }

      tourney.pendingTeams = tourney.pendingTeams.filter(
        (t) => t.toString() !== req.params.tid
      );
      tourney.teams.push(req.params.tid);
      await tourney.save();
      res.json({ message: "Team approved" });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.delete("/:id/teams/:tid", protect, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    const team = await Team.findById(req.params.tid);
    const isMyTeam =
      team &&
      (team.owner.toString() === req.user.id ||
        team.members.some((m) => m.user.toString() === req.user.id));
    if (tourney.organizer.toString() !== req.user.id && !isMyTeam) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (
      tourney.status === "BRACKET_LOCKED" ||
      tourney.status === "IN_PROGRESS" ||
      tourney.status === "COMPLETE"
    ) {
      return res
        .status(400)
        .json({ message: "Cannot remove teams after bracket is locked" });
    }

    tourney.pendingTeams = tourney.pendingTeams.filter(
      (t) => t.toString() !== req.params.tid
    );
    tourney.teams = tourney.teams.filter(
      (t) => t.toString() !== req.params.tid
    );
    await tourney.save();
    res.json({ message: "Team removed" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/phases/:idx", protect, isOrganizer, async (req, res) => {
  try {
    const { status } = req.body;
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney.phases[req.params.idx]) {
      return res.status(400).json({ message: "Invalid phase index" });
    }

    if (tourney.status !== "IN_PROGRESS") {
      return res
        .status(400)
        .json({ message: "Can only update phases during tournament" });
    }

    tourney.phases[req.params.idx].status = status;
    await tourney.save();
    res.json(tourney.phases[req.params.idx]);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/bracket", protect, isOrganizer, async (req, res) => {
  try {
    const { phaseIndex, matches } = req.body;
    if (typeof phaseIndex !== "number" || !Array.isArray(matches)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const tourney = await Tournament.findById(req.params.id);
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });

    if (
      tourney.status !== "BRACKET_LOCKED" &&
      tourney.status !== "IN_PROGRESS"
    ) {
      return res.status(400).json({
        message: "Can only update bracket after it's locked",
      });
    }

    const results = [];
    for (const m of matches) {
      const filter = { tournament: req.params.id, phaseIndex, slot: m.slot };

      const currentMatch = await Match.findOne(filter);

      const update = {};

      if (m.teamA !== undefined) {
        update.teamA = m.teamA;
      }
      if (m.teamB !== undefined) {
        update.teamB = m.teamB;
      }

      if (!currentMatch) {
        update.teamA = m.teamA || null;
        update.teamB = m.teamB || null;
      }

      const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
      results.push(await Match.findOneAndUpdate(filter, update, opts));
    }
    res.json(results);
  } catch (err) {
    console.error("Error updating bracket:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

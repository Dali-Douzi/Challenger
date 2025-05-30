const express = require("express");
const router = express.Router();
const Tournament = require("../models/Tournament");
const Match = require("../models/Match");
const { protect } = require("../middleware/authMiddleware");

// -- Permission checks --

async function isOrganizer(req, res, next) {
  const tourney = await Tournament.findById(req.params.id);
  if (!tourney)
    return res.status(404).json({ message: "Tournament not found" });
  if (tourney.organizer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Organizer only" });
  }
  next();
}

async function isRefereeOrOrganizer(req, res, next) {
  const tourney = await Tournament.findById(req.params.id);
  if (!tourney)
    return res.status(404).json({ message: "Tournament not found" });
  const isOrg = tourney.organizer.toString() === req.user.id;
  const isRef = tourney.referees.some((r) => r.toString() === req.user.id);
  if (!isOrg && !isRef) {
    return res.status(403).json({ message: "Referee or organizer only" });
  }
  next();
}

// -- Helpers --

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
      // Winner bracket (first round)
      const winnerMatches = Array.from({ length: slots / 2 }, (_, i) => ({
        slot: i + 1,
        teamA: null,
        teamB: null,
        stage: "winner",
      }));
      // Loser bracket skeleton (all matches except the final)
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

// -- Routes --

// List all tournaments (newest-first)
router.get("/", protect, async (req, res) => {
  try {
    const tours = await Tournament.find()
      .sort({ createdAt: -1 })
      .select("name description status createdAt");
    res.json(tours);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Lookup by referee code
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

// Full profile with flags
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
    res.json(obj);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Generate bracket skeleton for a phase
router.get(
  "/:id/bracket-template/:phaseIndex",
  protect,
  isRefereeOrOrganizer,
  async (req, res) => {
    try {
      const tourney = await Tournament.findById(req.params.id);
      if (!tourney)
        return res.status(404).json({ message: "Tournament not found" });

      const idx = Number(req.params.phaseIndex);
      const phase = tourney.phases[idx];
      if (!phase)
        return res.status(400).json({ message: "Invalid phase index" });

      const template = makeBracketTemplate(
        tourney.teams.length,
        phase.bracketType
      );
      res.json(template);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create
router.post("/", protect, async (req, res) => {
  try {
    const { name, description, maxParticipants, phases } = req.body;
    if (!name || !description || !maxParticipants || !phases?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const refereeCode = await generateUniqueCode();
    const newTourney = new Tournament({
      name,
      description,
      maxParticipants,
      phases,
      organizer: req.user.id,
      refereeCode,
    });
    res.status(201).json(await newTourney.save());
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Lock registrations
router.put(
  "/:id/lock-registrations",
  protect,
  isOrganizer,
  async (req, res) => {
    try {
      res.json(
        await Tournament.findByIdAndUpdate(
          req.params.id,
          { status: "REGISTRATION_LOCKED" },
          { new: true }
        )
      );
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Lock bracket
router.put("/:id/lock-bracket", protect, isOrganizer, async (req, res) => {
  try {
    res.json(
      await Tournament.findByIdAndUpdate(
        req.params.id,
        { status: "BRACKET_LOCKED" },
        { new: true }
      )
    );
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Start
router.put("/:id/start", protect, isRefereeOrOrganizer, async (req, res) => {
  try {
    res.json(
      await Tournament.findByIdAndUpdate(
        req.params.id,
        { status: "IN_PROGRESS" },
        { new: true }
      )
    );
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Complete
router.put("/:id/complete", protect, isOrganizer, async (req, res) => {
  try {
    res.json(
      await Tournament.findByIdAndUpdate(
        req.params.id,
        { status: "COMPLETE" },
        { new: true }
      )
    );
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Join as referee
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

// Remove referee
router.delete("/:id/referees/:uid", protect, isOrganizer, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    tourney.referees = tourney.referees.filter(
      (r) => r.toString() !== req.params.uid
    );
    await tourney.save();
    res.json({ message: "Referee removed" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Team signup
router.post("/:id/teams", protect, async (req, res) => {
  try {
    const { teamId } = req.body;
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney)
      return res.status(404).json({ message: "Tournament not found" });
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

// List pending team requests
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

// Approve team
router.put(
  "/:id/teams/:tid/approve",
  protect,
  isOrganizer,
  async (req, res) => {
    try {
      const tourney = await Tournament.findById(req.params.id);
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

// Remove team
router.delete("/:id/teams/:tid", protect, isOrganizer, async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
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

// Update phase status
router.put("/:id/phases/:idx", protect, isOrganizer, async (req, res) => {
  try {
    const { status } = req.body;
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney.phases[req.params.idx]) {
      return res.status(400).json({ message: "Invalid phase index" });
    }
    tourney.phases[req.params.idx].status = status;
    await tourney.save();
    res.json(tourney.phases[req.params.idx]);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Save manual bracket assignments
router.put("/:id/bracket", protect, isOrganizer, async (req, res) => {
  try {
    const { phaseIndex, matches } = req.body;
    if (typeof phaseIndex !== "number" || !Array.isArray(matches)) {
      return res.status(400).json({ message: "Invalid payload" });
    }
    const results = [];
    for (const m of matches) {
      const filter = { tournament: req.params.id, phaseIndex, slot: m.slot };
      const update = { teamA: m.teamA || null, teamB: m.teamB || null };
      const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
      results.push(await Match.findOneAndUpdate(filter, update, opts));
    }
    res.json(results);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

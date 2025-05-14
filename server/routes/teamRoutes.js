const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// Create a team
router.post("/create", protect, async (req, res) => {
  const { name, game, rank } = req.body;
  const userId = req.user.id;

  try {
    const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Random 6-char team code
    const team = await Team.create({
      name,
      game,
      rank,
      owner: userId,
      members: [{ user: userId, role: "owner" }],
      teamCode, // Store team code
    });

    res.status(201).json(team);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.name) {
      return res.status(400).json({ message: "Team name already exists" });
    }

    console.error("Team creation error:", err);
    res.status(500).json({ message: "Error creating team", error: err.message });
  }
});

// Get user's teams
router.get("/my", protect, async (req, res) => {
  const userId = req.user.id;
  try {
    const teams = await Team.find({
      "members.user": userId,
    }).populate("members.user", "username email");

    res.status(200).json(teams);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ message: "Error fetching teams" });
  }
});

// Get team details by teamId
router.get("/:id", protect, async (req, res) => {
  const teamId = req.params.id;

  try {
    const team = await Team.findById(teamId).populate("members.user", "username email");
    if (!team) return res.status(404).json({ message: "Team not found" });

    res.status(200).json(team);
  } catch (err) {
    console.error("Error fetching team:", err);
    res.status(500).json({ message: "Error fetching team details" });
  }
});

// Join a team by team code
router.post("/join", protect, async (req, res) => {
  const { teamCode } = req.body;
  const userId = req.user.id;

  try {
    const team = await Team.findOne({ teamCode });

    if (!team) return res.status(404).json({ message: "Invalid team code" });

    // Check if user is already a member
    if (team.members.some((member) => member.user.toString() === userId)) {
      return res.status(400).json({ message: "You are already a member of this team" });
    }

    // Add user to team
    team.members.push({ user: userId, role: "player" });
    await team.save();

    // Optionally, add team to user document (if needed)
    const user = await User.findById(userId);
    user.teams.push(team._id);
    await user.save();

    res.status(200).json({ message: "Joined team successfully", team });
  } catch (err) {
    console.error("Error joining team:", err);
    res.status(500).json({ message: "Error joining team" });
  }
});

module.exports = router;

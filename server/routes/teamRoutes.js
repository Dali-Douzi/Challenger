const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const Team = require("../models/Team");
const User = require("../models/User");
const Game = require("../models/Game");
const { protect } = require("../middleware/authMiddleware");

const optionalProtect = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
  } catch (err) {
    req.user = null;
  }
  next();
};

/**
 * @route   GET /api/teams
 * @desc    Get all teams (public, but if ?mine=true only return teams the user belongs to)
 * @access  Public (optional protection)
 */
router.get("/", optionalProtect, async (req, res) => {
  try {
    const { mine } = req.query;
    if (mine === "true" && req.user) {
      const userId = req.user.id;
      // only teams you belong to
      const teams = await Team.find({ "members.user": userId }).populate(
        "members.user",
        "username email avatar"
      );
      return res.status(200).json(teams);
    }
    // fallback: same as GET /my
    if (req.user) {
      const userId = req.user.id;
      const teams = await Team.find({ "members.user": userId }).populate(
        "members.user",
        "username email avatar"
      );
      return res.status(200).json(teams);
    }
    // If not authenticated, return empty array or all public teams
    return res.status(200).json([]);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ message: "Error fetching teams" });
  }
});

/**
 * @route   GET /api/teams/my
 * @desc    Get teams of the logged-in user
 * @access  Private
 */
router.get("/my", protect, async (req, res) => {
  const userId = req.user.id;
  try {
    const teams = await Team.find({ "members.user": userId }).populate(
      "members.user",
      "username email avatar"
    );
    res.status(200).json(teams);
  } catch (err) {
    console.error("Error fetching user teams:", err);
    res.status(500).json({ message: "Error fetching user teams" });
  }
});

/**
 * @route   POST /api/teams
 * @desc    Create a new team
 * @access  Private
 */
router.post("/", protect, async (req, res) => {
  const { name, gameId, description } = req.body;
  const userId = req.user.id;

  try {
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    const newTeam = new Team({
      name,
      game: gameId,
      description,
      owner: userId,
      members: [{ user: userId, role: "owner", rank: "owner" }],
      logo: "",
    });

    await newTeam.save();

    // Add this team to the owner's list
    const ownerUser = await User.findById(userId);
    ownerUser.teams.push(newTeam._id);
    await ownerUser.save();

    const populatedTeam = await Team.findById(newTeam._id).populate(
      "members.user",
      "username email avatar"
    );
    res.status(201).json(populatedTeam);
  } catch (err) {
    console.error("Error creating team:", err);
    res.status(500).json({ message: "Error creating team" });
  }
});

/**
 * @route   GET /api/teams/:id
 * @desc    Get a single team by ID
 * @access  Public (optional protection)
 */
router.get("/:id", optionalProtect, async (req, res) => {
  const teamId = req.params.id;
  try {
    const team = await Team.findById(teamId).populate(
      "members.user",
      "username email avatar"
    );
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.status(200).json(team);
  } catch (err) {
    console.error("Error fetching team:", err);
    res.status(500).json({ message: "Error fetching team" });
  }
});

/**
 * @route   PUT /api/teams/:id
 * @desc    Update team details (only owner)
 * @access  Private
 */
router.put("/:id", protect, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.id;
  const { name, description, gameId } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (name) team.name = name;
    if (description) team.description = description;
    if (gameId) {
      const game = await Game.findById(gameId);
      if (!game) return res.status(404).json({ message: "Game not found" });
      team.game = gameId;
    }
    await team.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email avatar"
    );
    res.status(200).json(updatedTeam);
  } catch (err) {
    console.error("Error updating team:", err);
    res.status(500).json({ message: "Error updating team" });
  }
});

/**
 * @route   DELETE /api/teams/:id
 * @desc    Delete a team (only owner)
 * @access  Private
 */
router.delete("/:id", protect, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Remove logo file if exists
    if (team.logo) {
      const logoPath = path.join(
        __dirname,
        "../",
        "uploads",
        "logos",
        path.basename(team.logo)
      );
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    // Remove team from members' team lists
    for (let member of team.members) {
      const memberUser = await User.findById(member.user);
      memberUser.teams = memberUser.teams.filter(
        (t) => t.toString() !== teamId
      );
      await memberUser.save();
    }

    await team.remove();
    res.status(200).json({ message: "Team deleted" });
  } catch (err) {
    console.error("Error deleting team:", err);
    res.status(500).json({ message: "Error deleting team" });
  }
});

/**
 * @route   PUT /api/teams/:id/logo
 * @desc    Upload or update a team's logo (only owner)
 * @access  Private
 */
const multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/logos/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const logoUpload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("File must be an image"));
    }
    cb(null, true);
  },
});

router.put("/:id/logo", protect, (req, res) => {
  // Use the middleware
  logoUpload.single("logo")(req, res, async (err) => {
    if (err) {
      console.error("🔥 Logo upload error:", err);
      return res.status(400).json({ message: err.message });
    }

    const teamId = req.params.id;
    const userId = req.user.id;

    try {
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      if (team.owner.toString() !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to upload logo" });
      }

      // Delete old logo file if it exists
      if (team.logo) {
        const oldPath = path.join(
          __dirname,
          "../",
          "uploads",
          "logos",
          path.basename(team.logo)
        );
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update team with new logo path
      team.logo = `uploads/logos/${req.file.filename}`;
      await team.save();

      const updatedTeam = await Team.findById(teamId).populate(
        "members.user",
        "username email avatar"
      );

      res.status(200).json({
        message: "Team logo updated successfully",
        team: updatedTeam,
      });
    } catch (err) {
      console.error("Error updating logo:", err);
      res.status(500).json({ message: "Error updating logo" });
    }
  });
});

/**
 * @route   DELETE /api/teams/:id/logo
 * @desc    Delete a team's logo (only owner)
 * @access  Private
 */
router.delete("/:id/logo", protect, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to delete logo" });
    }

    // Remove logo from team
    team.logo = "";
    await team.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email avatar"
    );

    res.status(200).json({
      message: "Team logo deleted successfully",
      team: updatedTeam,
    });
  } catch (err) {
    console.error("Error deleting team logo:", err);
    res.status(500).json({ message: "Error deleting team logo" });
  }
});

/**
 * @route   POST /api/teams/:id/join
 * @desc    Join a team by code (becomes a "player")
 * @access  Private
 */
router.post("/:id/join", protect, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.id;
  const { code } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.code !== code) {
      return res.status(401).json({ message: "Invalid code" });
    }

    // Prevent re-joining
    if (team.members.some((m) => m.user.toString() === userId)) {
      return res.status(400).json({ message: "Already a member" });
    }

    team.members.push({ user: userId, role: "player", rank: "player" });
    await team.save();

    // Add team to user's list
    const memberUser = await User.findById(userId);
    memberUser.teams.push(teamId);
    await memberUser.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email avatar"
    );
    res.status(200).json({ message: "Joined team", team: updatedTeam });
  } catch (err) {
    console.error("Error joining team:", err);
    res.status(500).json({ message: "Error joining team" });
  }
});

/**
 * @route   PUT /api/teams/:teamId/members/:memberId/role
 * @desc    Change a member's role (only owner)
 * @access  Private
 */
router.put("/:teamId/members/:memberId/role", protect, async (req, res) => {
  const teamId = req.params.teamId;
  const memberId = req.params.memberId;
  const { role } = req.body;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const target = team.members.id(memberId);
    if (!target) {
      return res.status(404).json({ message: "Member not found" });
    }

    target.role = role;
    await team.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email avatar"
    );
    res.status(200).json(updatedTeam);
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ message: "Error updating role" });
  }
});

/**
 * @route   PUT /api/teams/:teamId/members/:memberId/rank
 * @desc    Change a member's rank (only owner)
 * @access  Private
 */
router.put("/:teamId/members/:memberId/rank", protect, async (req, res) => {
  const teamId = req.params.teamId;
  const memberId = req.params.memberId;
  const { rank } = req.body;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const target = team.members.id(memberId);
    if (!target) {
      return res.status(404).json({ message: "Member not found" });
    }

    target.rank = rank;
    await team.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email avatar"
    );
    res.status(200).json(updatedTeam);
  } catch (err) {
    console.error("Error updating rank:", err);
    res.status(500).json({ message: "Error updating rank" });
  }
});

/**
 * @route   DELETE /api/teams/:teamId/members/self
 * @desc    Leave the team (self)
 * @access  Private
 */
router.delete("/:teamId/members/self", protect, async (req, res) => {
  const teamId = req.params.teamId;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Prevent owner from leaving
    if (team.owner.toString() === userId) {
      return res.status(400).json({ message: "Owner cannot leave team" });
    }

    team.members = team.members.filter((m) => m.user.toString() !== userId);
    await team.save();

    // Remove team from user's list
    const memberUser = await User.findById(userId);
    memberUser.teams = memberUser.teams.filter((t) => t.toString() !== teamId);
    await memberUser.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email avatar"
    );
    res.status(200).json({ message: "Left team", team: updatedTeam });
  } catch (err) {
    console.error("Error leaving team:", err);
    res.status(500).json({ message: "Error leaving team" });
  }
});

/**
 * @route   DELETE /api/teams/:teamId/members/:memberId
 * @desc    Remove a member from the team (only owner)
 * @access  Private
 */
router.delete("/:teamId/members/:memberId", protect, async (req, res) => {
  const teamId = req.params.teamId;
  const memberId = req.params.memberId;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const memberToRemove = team.members.id(memberId);
    if (!memberToRemove) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Prevent owner from removing themselves
    if (memberToRemove.user.toString() === userId) {
      return res.status(400).json({ message: "Owner cannot be removed" });
    }

    // Remove from team and save
    team.members = team.members.filter((m) => m._id.toString() !== memberId);
    await team.save();

    // Remove team from user
    const memberUser = await User.findById(memberToRemove.user);
    memberUser.teams = memberUser.teams.filter((t) => t.toString() !== teamId);
    await memberUser.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email avatar"
    );
    res.status(200).json({ message: "Member removed", team: updatedTeam });
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ message: "Error removing member" });
  }
});

module.exports = router;

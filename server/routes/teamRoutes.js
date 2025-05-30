const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const User = require("../models/User");
const Game = require("../models/Game");
const { protect } = require("../middleware/authMiddleware");

/**
 * List teams for the current user if `?mine=true` is passed,
 * otherwise fall back to your existing “my teams” logic.
 */
router.get("/", protect, async (req, res) => {
  const userId = req.user.id;
  try {
    if (req.query.mine === "true") {
      // only teams you belong to
      const teams = await Team.find({ "members.user": userId }).populate(
        "members.user",
        "username email"
      );
      return res.status(200).json(teams);
    }
    // fallback: same as GET /my
    const teams = await Team.find({ "members.user": userId }).populate(
      "members.user",
      "username email"
    );
    res.status(200).json(teams);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ message: "Error fetching teams" });
  }
});

/**
 * Create a new team.
 */
router.post("/create", protect, async (req, res) => {
  const { name, game, rank, server } = req.body;
  const userId = req.user.id;

  try {
    const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const team = await Team.create({
      name,
      game,
      rank,
      server,
      owner: userId,
      members: [{ user: userId, role: "owner", rank }],
      teamCode,
    });
    res.status(201).json(team);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.name) {
      return res.status(400).json({ message: "Team name already exists" });
    }
    console.error("Team creation error:", err);
    res
      .status(500)
      .json({ message: "Error creating team", error: err.message });
  }
});

/**
 * List teams for the current user (duplicate of `/` fallback).
 */
router.get("/my", protect, async (req, res) => {
  const userId = req.user.id;
  try {
    const teams = await Team.find({ "members.user": userId }).populate(
      "members.user",
      "username email"
    );
    res.status(200).json(teams);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ message: "Error fetching teams" });
  }
});

/**
 * Get a team's details (including available ranks for its game).
 */
router.get("/:id", protect, async (req, res) => {
  const teamId = req.params.id;
  try {
    const team = await Team.findById(teamId).populate(
      "members.user",
      "username email"
    );
    if (!team) return res.status(404).json({ message: "Team not found" });

    const gameDoc = await Game.findOne({ name: team.game });
    const availableRanks = Array.isArray(gameDoc?.ranks) ? gameDoc.ranks : [];

    res.status(200).json({
      ...team.toObject(),
      availableRanks,
    });
  } catch (err) {
    console.error("Error fetching team:", err);
    res.status(500).json({ message: "Error fetching team details" });
  }
});

/**
 * Delete a team (owner only).
 */
router.delete("/:id", protect, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.owner.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only the owner can delete this team" });
    }

    // Remove team reference from all members
    await User.updateMany({ teams: teamId }, { $pull: { teams: teamId } });

    // Delete the team itself
    await Team.deleteOne({ _id: teamId });

    res.status(200).json({ message: "Team deleted" });
  } catch (err) {
    console.error("Error deleting team:", err);
    res.status(500).json({ message: "Error deleting team" });
  }
});

/**
 * Join a team by its code.
 */
router.post("/join", protect, async (req, res) => {
  const { teamCode } = req.body;
  const userId = req.user.id;

  try {
    const team = await Team.findOne({ teamCode });
    if (!team) return res.status(404).json({ message: "Invalid team code" });
    if (team.members.some((m) => m.user.toString() === userId)) {
      return res
        .status(400)
        .json({ message: "You are already a member of this team" });
    }

    team.members.push({ user: userId, role: "player", rank: team.rank });
    await team.save();

    const user = await User.findById(userId);
    user.teams.push(team._id);
    await user.save();

    res.status(200).json({ message: "Joined team successfully", team });
  } catch (err) {
    console.error("Error joining team:", err);
    res.status(500).json({ message: "Error joining team" });
  }
});

/**
 * Change a member's role.
 */
router.put("/:teamId/members/:memberId/role", protect, async (req, res) => {
  const { teamId, memberId } = req.params;
  const { role } = req.body;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const requester = team.members.find((m) => m.user.toString() === userId);
    const target = team.members.find((m) => m.user.toString() === memberId);
    if (!requester || !target) {
      return res.status(404).json({ message: "Membership not found" });
    }
    if (target.role === "owner") {
      return res.status(403).json({ message: "Cannot change owner's role" });
    }

    let allowed = [];
    if (requester.role === "owner") {
      allowed = ["manager", "substitute", "player"];
    } else if (requester.role === "manager") {
      allowed = ["player", "substitute"];
    }
    if (!allowed.includes(role)) {
      return res
        .status(403)
        .json({ message: "Not authorized to assign this role" });
    }

    target.role = role;
    await team.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email"
    );
    res.status(200).json(updatedTeam);
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ message: "Error updating member role" });
  }
});

/**
 * Change a member's rank.
 */
router.put("/:teamId/members/:memberId/rank", protect, async (req, res) => {
  const { teamId, memberId } = req.params;
  const { rank } = req.body;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const requester = team.members.find((m) => m.user.toString() === userId);
    const target = team.members.find((m) => m.user.toString() === memberId);
    if (!requester || !target) {
      return res.status(404).json({ message: "Membership not found" });
    }

    if (!["owner", "manager"].includes(requester.role)) {
      return res.status(403).json({ message: "Not authorized to change rank" });
    }

    const gameDoc = await Game.findOne({ name: team.game });
    if (!Array.isArray(gameDoc?.ranks) || !gameDoc.ranks.includes(rank)) {
      return res.status(400).json({ message: "Invalid rank for this game" });
    }

    target.rank = rank;
    await team.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email"
    );
    res.status(200).json(updatedTeam);
  } catch (err) {
    console.error("Error updating rank:", err);
    res.status(500).json({ message: "Error updating member rank" });
  }
});

/**
 * Leave the team (self-remove).
 */
router.delete("/:teamId/members/self", protect, async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const selfMember = team.members.find((m) => m.user.toString() === userId);
    if (!selfMember) {
      return res
        .status(400)
        .json({ message: "You are not a member of this team" });
    }
    if (selfMember.role === "owner") {
      return res
        .status(403)
        .json({ message: "Owner must transfer ownership before leaving" });
    }

    team.members = team.members.filter((m) => m.user.toString() !== userId);
    await team.save();

    const user = await User.findById(userId);
    user.teams = user.teams.filter((t) => t.toString() !== teamId);
    await user.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email"
    );
    res.status(200).json({ message: "Left team", team: updatedTeam });
  } catch (err) {
    console.error("Error leaving team:", err);
    res.status(500).json({ message: "Error leaving team" });
  }
});

/**
 * Kick a member (owner only).
 */
router.delete("/:teamId/members/:memberId", protect, async (req, res) => {
  const { teamId, memberId } = req.params;
  const userId = req.user.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const requester = team.members.find((m) => m.user.toString() === userId);
    if (!requester || requester.role !== "owner") {
      return res.status(403).json({ message: "Only owner can remove members" });
    }
    if (memberId === userId) {
      return res
        .status(400)
        .json({ message: "Owner cannot remove themselves" });
    }

    team.members = team.members.filter((m) => m.user.toString() !== memberId);
    await team.save();

    const memberUser = await User.findById(memberId);
    memberUser.teams = memberUser.teams.filter((t) => t.toString() !== teamId);
    await memberUser.save();

    const updatedTeam = await Team.findById(teamId).populate(
      "members.user",
      "username email"
    );
    res.status(200).json({ message: "Member removed", team: updatedTeam });
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ message: "Error removing member" });
  }
});

module.exports = router;

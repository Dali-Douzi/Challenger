const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const Team = require("../models/Team");
const User = require("../models/User");
const Game = require("../models/Game");
const Scrim = require("../models/Scrim");
const Notification = require("../models/Notification");
const ScrimChat = require("../models/ScrimChat");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const logoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "challenger/team-logos",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif"],
    transformation: [
      { width: 400, height: 400, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
    public_id: (req, file) => {
      return `team_logo_${req.params.id || Date.now()}_${Math.round(
        Math.random() * 1e9
      )}`;
    },
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowedTypes = [
      "image/png",
      "image/jpg",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only image files (PNG, JPG, JPEG, WEBP, GIF) are allowed!"),
        false
      );
    }
  },
});

const deleteOldLogo = async (logoUrl) => {
  try {
    if (logoUrl && logoUrl.includes("cloudinary")) {
      const publicId = logoUrl.split("/").pop().split(".")[0];
      const fullPublicId = `challenger/team-logos/${publicId}`;

      const result = await cloudinary.uploader.destroy(fullPublicId);
      console.log(
        `Deleted old team logo from Cloudinary: ${fullPublicId}`,
        result
      );
    }
  } catch (error) {
    console.error("Error deleting old team logo from Cloudinary:", error);
  }
};

const optionalProtect = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
  } catch (err) {
    req.user = null;
  }
  next();
};

router.get("/games", async (req, res) => {
  try {
    console.log("🎮 Fetching games from database...");
    res.set({
      "Cache-Control": "public, max-age=300",
      ETag: `"games-${Date.now()}"`,
    });

    const games = await Game.find({}).lean();
    console.log("🎮 Games found:", games.length);
    console.log("🎮 Games data:", games);

    res.json(games);
  } catch (error) {
    console.error("❌ Error fetching games:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching games",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.get("/my", protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const teams = await Team.find({ "members.user": userId })
      .populate("members.user", "username email avatar")
      .populate("game", "name");
    return res.status(200).json(teams);
  } catch (err) {
    console.error("Error fetching user teams:", err);
    return res.status(500).json({ message: "Error fetching user teams" });
  }
});

router.post("/create", protect, (req, res) => {
  logoUpload.single("logo")(req, res, async (err) => {
    if (err) {
      console.error("Logo upload error:", err);
      return res.status(400).json({ message: err.message });
    }

    const { name, game, rank, server, description } = req.body;
    const userId = req.user.userId;

    if (!name || !game || !rank || !server) {
      return res
        .status(400)
        .json({ message: "Please provide name, game, rank, and server" });
    }

    try {
      const gameDoc = await Game.findOne({ name: game });
      if (!gameDoc) {
        return res.status(404).json({ message: "Game not found" });
      }

      const teamCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const newTeamData = {
        name,
        game: gameDoc._id,
        rank,
        server,
        description: description || "",
        owner: userId,
        members: [{ user: userId, role: "owner", rank }],
        teamCode: teamCode,
        logo: req.file ? req.file.path : "", // Cloudinary URL
      };

      const newTeam = new Team(newTeamData);
      await newTeam.save();

      const ownerUser = await User.findById(userId);
      if (ownerUser) {
        ownerUser.teams.push(newTeam._id);
        await ownerUser.save();
      }

      const populatedTeam = await Team.findById(newTeam._id)
        .populate("members.user", "username email avatar")
        .populate("game", "name");
      return res.status(201).json(populatedTeam);
    } catch (error) {
      console.error("Error creating team:", error);
      return res.status(500).json({ message: "Error creating team" });
    }
  });
});

router.post("/join", protect, async (req, res) => {
  const userId = req.user.userId;
  const { teamCode } = req.body;

  if (!teamCode) {
    return res.status(400).json({ message: "Team code is required" });
  }

  try {
    const team = await Team.findOne({ teamCode: teamCode.toUpperCase() });
    if (!team) {
      return res.status(404).json({ message: "Invalid team code" });
    }

    if (team.members.some((m) => m.user.toString() === userId)) {
      return res.status(400).json({ message: "Already a member of this team" });
    }

    team.members.push({ user: userId, role: "player", rank: team.rank });
    await team.save();

    const memberUser = await User.findById(userId);
    if (memberUser) {
      memberUser.teams.push(team._id);
      await memberUser.save();
    }

    const updatedTeam = await Team.findById(team._id)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    return res
      .status(200)
      .json({ message: "Joined team successfully", team: updatedTeam });
  } catch (error) {
    console.error("Error joining team:", error);
    return res.status(500).json({ message: "Error joining team" });
  }
});

router.get("/:id", optionalProtect, async (req, res) => {
  const teamId = req.params.id;
  try {
    const team = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");
    if (!team) return res.status(404).json({ message: "Team not found" });
    return res.status(200).json(team);
  } catch (err) {
    console.error("Error fetching team:", err);
    return res.status(500).json({ message: "Error fetching team" });
  }
});

router.put("/:id", protect, (req, res) => {
  logoUpload.single("logo")(req, res, async (err) => {
    if (err) {
      console.error("Logo upload error:", err);
      return res.status(400).json({ message: err.message });
    }

    const teamId = req.params.id;
    const userId = req.user.userId;
    const { name, game, rank, server, description } = req.body;

    try {
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).json({ message: "Team not found" });

      if (team.owner.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (name) team.name = name;
      if (game) {
        const gameDoc = await Game.findOne({ name: game });
        if (!gameDoc) {
          return res.status(404).json({ message: "Game not found" });
        }
        team.game = gameDoc._id;
      }
      if (rank) team.rank = rank;
      if (server) team.server = server;
      if (description !== undefined) team.description = description;

      if (req.file) {
        // Delete old logo from Cloudinary if it exists
        if (team.logo) {
          await deleteOldLogo(team.logo);
        }
        team.logo = req.file.path; // Cloudinary URL
      }

      await team.save();

      const updatedTeam = await Team.findById(teamId)
        .populate("members.user", "username email avatar")
        .populate("game", "name");
      return res.status(200).json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      return res.status(500).json({ message: "Error updating team" });
    }
  });
});

router.put("/:id/logo", protect, (req, res) => {
  logoUpload.single("logo")(req, res, async (err) => {
    if (err) {
      console.error("Logo upload error:", err);

      const errorMessage =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Maximum size is 10MB"
          : err.message || "Logo upload failed";

      return res.status(400).json({ message: errorMessage });
    }

    const teamId = req.params.id;
    const userId = req.user.userId;

    try {
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).json({ message: "Team not found" });

      if (team.owner.toString() !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No logo file provided" });
      }

      if (team.logo) {
        await deleteOldLogo(team.logo);
      }

      team.logo = req.file.path;
      await team.save();

      const updatedTeam = await Team.findById(teamId)
        .populate("members.user", "username email avatar")
        .populate("game", "name");
      return res.status(200).json(updatedTeam);
    } catch (error) {
      console.error("Error updating logo:", error);
      return res.status(500).json({ message: "Error updating logo" });
    }
  });
});

router.delete("/:id/logo", protect, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.userId;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (team.logo) {
      await deleteOldLogo(team.logo);
      team.logo = "";
      await team.save();
    }

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");
    return res.status(200).json(updatedTeam);
  } catch (error) {
    console.error("Error deleting logo:", error);
    return res.status(500).json({ message: "Error deleting logo" });
  }
});

router.post("/:id/join", protect, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.userId;
  const { code } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.teamCode !== code) {
      return res.status(401).json({ message: "Invalid code" });
    }

    if (team.members.some((m) => m.user.toString() === userId)) {
      return res.status(400).json({ message: "Already a member" });
    }

    team.members.push({ user: userId, role: "player", rank: team.rank });
    await team.save();

    const memberUser = await User.findById(userId);
    if (memberUser) {
      memberUser.teams.push(teamId);
      await memberUser.save();
    }

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");
    return res.status(200).json({ message: "Joined team", team: updatedTeam });
  } catch (error) {
    console.error("Error joining team:", error);
    return res.status(500).json({ message: "Error joining team" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  const teamId = req.params.id;
  const userId = req.user.userId;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    console.log(`🗑️ Team deletion initiated: ${team.name} by user ${userId}`);

    if (team.logo) {
      await deleteOldLogo(team.logo);
    }

    for (const member of team.members) {
      const memberUser = await User.findById(member.user);
      if (memberUser) {
        memberUser.teams = memberUser.teams.filter(
          (tId) => tId.toString() !== teamId
        );
        await memberUser.save();
      }
    }

    await Team.findByIdAndDelete(teamId);

    console.log(`✅ Team deleted: ${team.name}`);

    try {
      console.log("🧹 Cleaning scrims where deleted team was posting team...");

      const orphanedScrims = await Scrim.find({ teamA: teamId });
      let cleanedScrims = 0;

      for (const scrim of orphanedScrims) {
        await ScrimChat.deleteMany({ scrim: scrim._id });
        await Notification.deleteMany({ scrim: scrim._id });

        const io = req.app.get("io");
        if (io) {
          const allTeams = [
            ...(Array.isArray(scrim.requests)
              ? scrim.requests.map((id) => id.toString())
              : []),
            ...(scrim.teamB ? [scrim.teamB.toString()] : []),
          ];

          allTeams.forEach((notifyTeamId) => {
            io.emit("scrimDeleted", {
              teamId: notifyTeamId,
              scrimId: scrim._id,
              message: `Scrim deleted because ${team.name} was deleted`,
            });
          });
        }

        await Scrim.findByIdAndDelete(scrim._id);
        cleanedScrims++;
        console.log(`🧹 Cleaned orphaned scrim: ${scrim._id}`);
      }

      const updatedScrims = await Scrim.updateMany(
        { requests: teamId },
        { $pull: { requests: teamId } }
      );

      console.log(
        `✅ Team deletion cleanup completed: ${cleanedScrims} scrims removed, ${updatedScrims.modifiedCount} scrims updated`
      );
    } catch (cleanupError) {
      console.error("⚠️ Team deletion cleanup failed:", cleanupError);
    }

    return res.status(200).json({
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting team:", error);
    return res.status(500).json({ message: "Error deleting team" });
  }
});

router.put("/:teamId/members/:memberId/role", protect, async (req, res) => {
  const teamId = req.params.teamId;
  const memberId = req.params.memberId;
  const { role } = req.body;
  const userId = req.user.userId;

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

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");
    return res.status(200).json(updatedTeam);
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ message: "Error updating role" });
  }
});

router.put("/:teamId/members/:memberId/rank", protect, async (req, res) => {
  const teamId = req.params.teamId;
  const memberId = req.params.memberId;
  const { rank } = req.body;
  const userId = req.user.userId;

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

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");
    return res.status(200).json(updatedTeam);
  } catch (error) {
    console.error("Error updating rank:", error);
    return res.status(500).json({ message: "Error updating rank" });
  }
});

router.delete("/:teamId/members/self", protect, async (req, res) => {
  const teamId = req.params.teamId;
  const userId = req.user.userId;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (team.owner.toString() === userId) {
      return res.status(400).json({ message: "Owner cannot leave team" });
    }

    team.members = team.members.filter((m) => m.user.toString() !== userId);
    await team.save();

    const memberUser = await User.findById(userId);
    memberUser.teams = memberUser.teams.filter((t) => t.toString() !== teamId);
    await memberUser.save();

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");
    return res.status(200).json({ message: "Left team", team: updatedTeam });
  } catch (error) {
    console.error("Error leaving team:", error);
    return res.status(500).json({ message: "Error leaving team" });
  }
});

router.delete("/:teamId/members/:memberId", protect, async (req, res) => {
  const teamId = req.params.teamId;
  const memberId = req.params.memberId;
  const userId = req.user.userId;

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

    if (memberToRemove.user.toString() === userId) {
      return res.status(400).json({ message: "Owner cannot be removed" });
    }

    team.members = team.members.filter((m) => m._id.toString() !== memberId);
    await team.save();

    const memberUser = await User.findById(memberToRemove.user);
    memberUser.teams = memberUser.teams.filter((t) => t.toString() !== teamId);
    await memberUser.save();

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");
    return res
      .status(200)
      .json({ message: "Member removed", team: updatedTeam });
  } catch (error) {
    console.error("Error removing member:", error);
    return res.status(500).json({ message: "Error removing member" });
  }
});

module.exports = router;

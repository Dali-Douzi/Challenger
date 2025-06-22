const express = require("express");
const mongoose = require("mongoose");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const Game = require("../models/Game");
const Notification = require("../models/Notification");
const ScrimChat = require("../models/ScrimChat");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

const checkTeamPermission = (team, userId) => {
  const isOwner = team.owner.toString() === userId;
  const isManager = team.members.some(
    (m) => m.user.toString() === userId && m.role === "manager"
  );
  return { isOwner, isManager, hasPermission: isOwner || isManager };
};

const sendErrorResponse = (res, status, message, details = null) => {
  const response = { success: false, message };
  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }
  return res.status(status).json(response);
};

router.get("/", protect, async (req, res) => {
  try {
    const { game, server, rank, status } = req.query;

    // Build the filter object
    const filter = {};

    // If game filter is provided, find the game and filter by it
    if (game) {
      const gameDoc = await Game.findOne({ name: game }).select("_id");
      if (gameDoc) {
        filter.game = gameDoc._id;
      } else {
        // If game not found, return empty results
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: "No scrims found for the specified game",
        });
      }
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    console.log("Scrim filters applied:", filter);

    let scrims = await Scrim.find(filter)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo")
      .sort({ createdAt: -1 });

    // Apply post-query filters (server and rank are team properties, not scrim properties)
    if (server || rank) {
      scrims = scrims.filter((scrim) => {
        let matchesServer = true;
        let matchesRank = true;

        if (server) {
          matchesServer =
            scrim.teamA?.server === server ||
            (scrim.teamB && scrim.teamB.server === server);
        }

        if (rank) {
          matchesRank =
            scrim.teamA?.rank === rank ||
            (scrim.teamB && scrim.teamB.rank === rank);
        }

        return matchesServer && matchesRank;
      });
    }

    console.log(`Found ${scrims.length} scrims after filtering`);

    res.json({
      success: true,
      data: scrims,
      count: scrims.length,
      filters: { game, server, rank, status },
    });
  } catch (error) {
    console.error("🔥 List scrims Error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
});

router.post("/", protect, async (req, res) => {
  const { teamId, format, scheduledTime } = req.body;

  try {
    if (!teamId || !format || !scheduledTime) {
      return sendErrorResponse(
        res,
        400,
        "Please provide teamId, format, and scheduledTime"
      );
    }

    validateObjectId(teamId, "team ID");

    const team = await Team.findById(teamId).populate("game", "formats name");
    if (!team) {
      return sendErrorResponse(res, 404, "Team not found");
    }

    const { hasPermission } = checkTeamPermission(team, req.user.userId);
    if (!hasPermission) {
      return sendErrorResponse(
        res,
        403,
        "Not authorized to create scrim for this team"
      );
    }

    let gameDoc = team.game;
    if (!gameDoc) {
      if (mongoose.Types.ObjectId.isValid(team.game)) {
        gameDoc = await Game.findById(team.game).select("formats name");
      } else {
        gameDoc = await Game.findOne({ name: team.game }).select(
          "formats name"
        );
      }
    }

    if (!gameDoc) {
      return sendErrorResponse(res, 404, "Game not found");
    }

    if (!gameDoc.formats.includes(format)) {
      return sendErrorResponse(
        res,
        400,
        `Invalid format for ${
          gameDoc.name
        }. Available formats: ${gameDoc.formats.join(", ")}`
      );
    }

    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return sendErrorResponse(
        res,
        400,
        "Scheduled time must be in the future"
      );
    }

    const scrim = await Scrim.create({
      teamA: team._id,
      game: gameDoc._id,
      format,
      scheduledTime: scheduledDate,
      status: "open",
    });

    const populatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("game", "name");

    res.status(201).json({
      success: true,
      message: "Scrim created successfully",
      data: populatedScrim,
    });
  } catch (error) {
    console.error("🔥 Scrim-create Error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error during scrim creation",
      error.message
    );
  }
});

router.post("/request/:scrimId", protect, async (req, res) => {
  try {
    const { scrimId } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      return sendErrorResponse(res, 400, "Please provide teamId");
    }

    validateObjectId(scrimId, "scrim ID");
    validateObjectId(teamId, "team ID");

    const scrim = await Scrim.findById(scrimId).populate("teamA", "name");
    if (!scrim) {
      return sendErrorResponse(res, 404, "Scrim not found");
    }

    if (scrim.status !== "open") {
      return sendErrorResponse(res, 400, "Scrim is not open for requests");
    }

    const requestingTeam = await Team.findById(teamId);
    if (!requestingTeam) {
      return sendErrorResponse(res, 404, "Requesting team not found");
    }

    const { hasPermission } = checkTeamPermission(
      requestingTeam,
      req.user.userId
    );
    if (!hasPermission) {
      return sendErrorResponse(
        res,
        403,
        "Not authorized to make requests for this team"
      );
    }

    if (scrim.teamA.toString() === teamId) {
      return sendErrorResponse(res, 400, "Cannot request your own scrim");
    }

    if (scrim.requests.some((id) => id.toString() === teamId)) {
      return sendErrorResponse(res, 400, "Scrim request already sent");
    }

    scrim.requests.push(teamId);
    await scrim.save();

    let chat = await ScrimChat.findOne({ scrim: scrim._id });
    if (!chat) {
      chat = new ScrimChat({ scrim: scrim._id, messages: [] });
      await chat.save();
    }

    const notification = await Notification.create({
      team: scrim.teamA._id,
      scrim: scrim._id,
      chat: chat._id,
      message: `${requestingTeam.name} requested your scrim`,
      type: "request",
      url: `/scrims/${scrim._id}/requests`,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: scrim.teamA._id,
        notification: notification,
      });
      console.log(
        `🔔 Emitted scrim request notification to team ${scrim.teamA._id}`
      );
    }

    const updatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo");

    return res.json({
      success: true,
      message: "Scrim request sent successfully",
      data: updatedScrim,
    });
  } catch (error) {
    console.error("🔥 Scrim-request Error:", error.stack);
    sendErrorResponse(
      res,
      500,
      "Server error during scrim request",
      error.message
    );
  }
});

router.get("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;

  try {
    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId)
      .populate("teamA", "name logo owner members game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo");

    if (!scrim) {
      return sendErrorResponse(res, 404, "Scrim not found");
    }

    const { hasPermission } = checkTeamPermission(scrim.teamA, req.user.userId);
    const payload = scrim.toObject();

    if (!hasPermission) {
      delete payload.requests;
    }

    res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error("🔥 Scrim-fetch Error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while fetching scrim",
      error.message
    );
  }
});

router.put("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { format, scheduledTime } = req.body;

  try {
    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId).populate(
      "game",
      "formats name"
    );
    if (!scrim) {
      return sendErrorResponse(res, 404, "Scrim not found");
    }

    const team = await Team.findById(scrim.teamA);
    if (!team) {
      return sendErrorResponse(res, 404, "Team not found");
    }

    const { hasPermission } = checkTeamPermission(team, req.user.userId);
    if (!hasPermission) {
      return sendErrorResponse(
        res,
        403,
        "Only the team owner or manager can edit this scrim"
      );
    }

    if (scrim.status === "booked") {
      return sendErrorResponse(res, 400, "Cannot edit a booked scrim");
    }

    if (format) {
      if (!scrim.game.formats.includes(format)) {
        return sendErrorResponse(
          res,
          400,
          `Invalid format for ${
            scrim.game.name
          }. Available formats: ${scrim.game.formats.join(", ")}`
        );
      }
      scrim.format = format;
    }

    if (scheduledTime) {
      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        return sendErrorResponse(
          res,
          400,
          "Scheduled time must be in the future"
        );
      }
      scrim.scheduledTime = scheduledDate;
    }

    const updated = await scrim.save();
    const populatedScrim = await Scrim.findById(updated._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo");

    res.json({
      success: true,
      message: "Scrim updated successfully",
      data: populatedScrim,
    });
  } catch (error) {
    console.error("🔥 Scrim-update Error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while updating scrim",
      error.message
    );
  }
});

router.delete("/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;

  try {
    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return sendErrorResponse(res, 404, "Scrim not found");
    }

    const team = await Team.findById(scrim.teamA);
    if (!team) {
      return sendErrorResponse(res, 404, "Team not found");
    }

    const { hasPermission } = checkTeamPermission(team, req.user.userId);
    if (!hasPermission) {
      return sendErrorResponse(
        res,
        403,
        "Only the team owner or manager can delete this scrim"
      );
    }

    console.log(`🗑️ Starting cascade delete for scrim ${scrimId}`);

    const chat = await ScrimChat.findOne({ scrim: scrimId });
    if (chat) {
      console.log(`🗑️ Deleting chat ${chat._id} for scrim ${scrimId}`);
      await ScrimChat.findByIdAndDelete(chat._id);

      const io = req.app.get("io");
      if (io) {
        io.to(chat._id.toString()).emit("chatDeleted", {
          message: "This scrim has been deleted by the organizer",
        });
      }
    }

    const deletedNotifications = await Notification.deleteMany({
      scrim: scrimId,
    });
    console.log(
      `🗑️ Deleted ${deletedNotifications.deletedCount} notifications for scrim ${scrimId}`
    );

    await Scrim.findByIdAndDelete(scrimId);
    console.log(`🗑️ Deleted scrim ${scrimId}`);

    const io = req.app.get("io");
    if (io) {
      const allTeams = [
        scrim.teamA.toString(),
        ...(Array.isArray(scrim.requests)
          ? scrim.requests.map((id) => id.toString())
          : []),
        ...(scrim.teamB ? [scrim.teamB.toString()] : []),
      ];

      allTeams.forEach((teamId) => {
        io.emit("scrimDeleted", {
          teamId: teamId,
          scrimId: scrimId,
          message: `Scrim deleted by ${team.name}`,
        });
      });
    }

    return res.json({
      success: true,
      message: "Scrim and related data removed successfully",
      details: {
        scrimDeleted: true,
        chatDeleted: !!chat,
        notificationsDeleted: deletedNotifications.deletedCount,
      },
    });
  } catch (error) {
    console.error("🔥 Scrim cascade delete Error:", error);
    sendErrorResponse(
      res,
      500,
      "Server error while deleting scrim",
      error.message
    );
  }
});

router.put("/accept/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { teamId } = req.body;

  try {
    if (!teamId) {
      return sendErrorResponse(res, 400, "Please provide teamId");
    }

    validateObjectId(scrimId, "scrim ID");
    validateObjectId(teamId, "team ID");

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return sendErrorResponse(res, 404, "Scrim not found");
    }

    if (scrim.status !== "open") {
      return sendErrorResponse(
        res,
        400,
        "Scrim is not open for accepting requests"
      );
    }

    const [postingTeam, requestingTeam] = await Promise.all([
      Team.findById(scrim.teamA),
      Team.findById(teamId),
    ]);

    if (!postingTeam || !requestingTeam) {
      return sendErrorResponse(res, 404, "Team not found");
    }

    const { hasPermission } = checkTeamPermission(postingTeam, req.user.userId);
    if (!hasPermission) {
      return sendErrorResponse(
        res,
        403,
        "Only the team owner or manager can accept this scrim"
      );
    }

    if (!scrim.requests.includes(teamId)) {
      return sendErrorResponse(
        res,
        400,
        "That team did not request this scrim"
      );
    }

    scrim.teamB = teamId;
    scrim.status = "booked";
    scrim.requests = [];
    await scrim.save();

    let chat = await ScrimChat.findOne({ scrim: scrim._id });
    if (!chat) {
      chat = new ScrimChat({ scrim: scrim._id, messages: [] });
      await chat.save();
      console.log(`💬 Created new chat for scrim ${scrim._id}:`, chat._id);
    }

    const [acceptNotification, feedbackNotification] = await Promise.all([
      Notification.create({
        team: teamId,
        scrim: scrim._id,
        chat: chat._id,
        message: `${postingTeam.name} accepted your scrim request`,
        type: "accept",
      }),
      Notification.create({
        team: scrim.teamA,
        scrim: scrim._id,
        chat: chat._id,
        message: `You accepted ${requestingTeam.name}'s request`,
        type: "accept-feedback",
      }),
    ]);

    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: teamId,
        notification: acceptNotification,
      });
      io.emit("newNotification", {
        teamId: scrim.teamA,
        notification: feedbackNotification,
      });
      console.log(
        `🔔 Emitted accept notifications to teams ${teamId} and ${scrim.teamA}`
      );
    }

    const updatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name");

    return res.json({
      success: true,
      message: "Scrim request accepted successfully",
      data: updatedScrim,
    });
  } catch (error) {
    console.error("🔥 Scrim-accept Error:", error.stack);
    sendErrorResponse(
      res,
      500,
      "Server error while accepting scrim",
      error.message
    );
  }
});

router.put("/decline/:scrimId", protect, async (req, res) => {
  const { scrimId } = req.params;
  const { teamId } = req.body;

  try {
    if (!teamId) {
      return sendErrorResponse(res, 400, "Please provide teamId");
    }

    validateObjectId(scrimId, "scrim ID");
    validateObjectId(teamId, "team ID");

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return sendErrorResponse(res, 404, "Scrim not found");
    }

    const [team, requestingTeam] = await Promise.all([
      Team.findById(scrim.teamA),
      Team.findById(teamId),
    ]);

    if (!team || !requestingTeam) {
      return sendErrorResponse(res, 404, "Team not found");
    }

    const { hasPermission } = checkTeamPermission(team, req.user.userId);
    if (!hasPermission) {
      return sendErrorResponse(
        res,
        403,
        "Only the team owner or manager can decline this scrim"
      );
    }

    if (!scrim.requests.includes(teamId)) {
      return sendErrorResponse(
        res,
        400,
        "That team did not request this scrim"
      );
    }

    scrim.requests = scrim.requests.filter((id) => id.toString() !== teamId);
    await scrim.save();

    let chat = await ScrimChat.findOne({ scrim: scrim._id });
    if (!chat) {
      chat = new ScrimChat({ scrim: scrim._id, messages: [] });
      await chat.save();
    }

    const notification = await Notification.create({
      team: teamId,
      scrim: scrim._id,
      chat: chat._id,
      message: `${team.name} declined your scrim request`,
      type: "decline",
      url: "/chats",
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: teamId,
        notification: notification,
      });
      console.log(`🔔 Emitted decline notification to team ${teamId}`);
    }

    const updatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo");

    return res.json({
      success: true,
      message: "Scrim request declined successfully",
      data: updatedScrim,
    });
  } catch (error) {
    console.error("🔥 Scrim-decline Error:", error.stack);
    sendErrorResponse(
      res,
      500,
      "Server error while declining scrim",
      error.message
    );
  }
});

module.exports = router;

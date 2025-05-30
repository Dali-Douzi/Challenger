const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const ScrimChat = require("./models/ScrimChat");
const Scrim = require("./models/Scrim");
const Team = require("./models/Team");
const Notification = require("./models/Notification");
const User = require("./models/User");
const Tournament = require("./models/Tournament");

module.exports = (io) => {
  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: token required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      console.error("🔒 Socket auth failed:", err.message);
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`🟢 Socket connected: ${socket.id} (user ${socket.userId})`);

    // Join team rooms for real-time notifications
    try {
      const teams = await Team.find({
        $or: [{ owner: socket.userId }, { "members.user": socket.userId }],
      }).select("_id");
      teams.forEach((t) => {
        socket.join(`team_${t._id}`);
      });

      // ALSO join the user's personal room for user-scoped emits
      socket.join(`user_${socket.userId}`);
    } catch (err) {
      console.error("Error joining team rooms:", err);
    }

    // Subscribe to tournament updates explicitly
    socket.on("subscribeTournament", (tournamentId) => {
      socket.join(`tournament_${tournamentId}`);
    });

    // === Scrim Chat Handlers ===
    socket.on("joinRoom", async (scrimId) => {
      try {
        const scrim = await Scrim.findById(scrimId);
        if (!scrim) return socket.emit("error", "Scrim not found");

        const teams = await Team.find({
          $or: [{ owner: socket.userId }, { "members.user": socket.userId }],
        }).select("_id");
        const teamIds = teams.map((t) => t._id.toString());

        const chat = await ScrimChat.findOne({
          scrim,
          $or: [{ owner: { $in: teamIds } }, { challenger: { $in: teamIds } }],
        });
        if (!chat) return socket.emit("error", "Chat thread not created");

        socket.join(chat._id.toString());
      } catch (err) {
        console.error("joinRoom error:", err);
        socket.emit("error", "Server error joining room");
      }
    });

    socket.on("sendMessage", async ({ scrimId, text }) => {
      if (!scrimId || !text) {
        return socket.emit("error", "Scrim ID and text are required");
      }
      try {
        const teams = await Team.find({
          $or: [{ owner: socket.userId }, { "members.user": socket.userId }],
        }).select("_id");
        const teamIds = teams.map((t) => t._id.toString());

        const chat = await ScrimChat.findOne({
          scrim: mongoose.Types.ObjectId(scrimId),
          $or: [{ owner: { $in: teamIds } }, { challenger: { $in: teamIds } }],
        });
        if (!chat) return socket.emit("error", "Chat thread not found");

        const room = chat._id.toString();
        if (!io.sockets.adapter.rooms.has(room)) {
          return socket.emit("error", "You must join the room first");
        }

        // Save message
        const msg = { sender: socket.userId, text, timestamp: new Date() };
        chat.messages.push(msg);
        await chat.save();

        const senderUser = await User.findById(socket.userId).select(
          "username avatar"
        );

        // Notify the other team(s)
        const recipientTeams = [
          chat.owner.toString(),
          chat.challenger.toString(),
        ].filter((tid) => !teamIds.includes(tid));
        for (const teamId of recipientTeams) {
          const notif = await Notification.create({
            team: teamId,
            scrim: scrimId,
            chat: chat._id,
            message: text,
            type: "message",
            url: "/chats",
          });
          io.to(`team_${teamId}`).emit("newNotification", notif);
        }

        // Broadcast new message
        io.to(room).emit("newMessage", { ...msg, sender: senderUser });
      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("error", "Server error sending message");
      }
    });

    // === Tournament Handlers ===

    socket.on(
      "createTournament",
      async ({ name, description, maxParticipants, phases }) => {
        try {
          const refereeCode = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
          const tournament = await Tournament.create({
            name,
            description,
            maxParticipants,
            phases,
            organizer: socket.userId,
            refereeCode,
            status: "REGISTRATION_OPEN",
          });
          // Notify organizer
          const notif = await Notification.create({
            team: null,
            tournament: tournament._id,
            message: `Tournament "${tournament.name}" created.`,
            url: `/tournaments/${tournament._id}`,
          });
          io.to(`user_${socket.userId}`).emit("newNotification", notif);
          io.emit("tournament:created", tournament);
        } catch (err) {
          console.error("createTournament error:", err);
          socket.emit("error", "Server error creating tournament");
        }
      }
    );

    socket.on("joinTournament", async ({ tournamentId, teamId }) => {
      try {
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) return socket.emit("error", "Tournament not found");
        if (
          tournament.pendingTeams.includes(teamId) ||
          tournament.teams.includes(teamId)
        ) {
          return socket.emit("error", "Already requested or joined");
        }
        tournament.pendingTeams.push(teamId);
        await tournament.save();

        // Notify organizer and broadcast join event
        const notif = await Notification.create({
          team: teamId,
          tournament: tournamentId,
          message: `Team requested to join "${tournament.name}".`,
          url: `/tournaments/${tournamentId}`,
        });
        io.to(`tournament_${tournamentId}`).emit("tournament:joined", {
          tournamentId,
          pendingCount: tournament.pendingTeams.length,
        });
        io.to(`team_${teamId}`).emit("newNotification", notif);
      } catch (err) {
        console.error("joinTournament error:", err);
        socket.emit("error", "Server error joining tournament");
      }
    });

    socket.on("startTournament", async ({ tournamentId }) => {
      try {
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) return socket.emit("error", "Tournament not found");
        if (tournament.organizer.toString() !== socket.userId) {
          return socket.emit("error", "Not authorized to start tournament");
        }
        tournament.status = "IN_PROGRESS";
        await tournament.save();

        // Notify all teams
        for (const teamId of tournament.teams) {
          const notif = await Notification.create({
            team: teamId,
            tournament: tournamentId,
            message: `Tournament "${tournament.name}" has started.`,
            url: `/tournaments/${tournamentId}`,
          });
          io.to(`team_${teamId}`).emit("newNotification", notif);
        }

        io.to(`tournament_${tournamentId}`).emit(
          "tournament:started",
          tournament
        );
      } catch (err) {
        console.error("startTournament error:", err);
        socket.emit("error", "Server error starting tournament");
      }
    });

    socket.on(
      "updateTournament",
      async ({ tournamentId, phaseIndex, matches }) => {
        try {
          const tournament = await Tournament.findById(tournamentId);
          if (!tournament) return socket.emit("error", "Tournament not found");

          // Save bracket changes (you might integrate existing route logic here)
          tournament.status = "IN_PROGRESS";
          await tournament.save();

          // Notify all teams of update
          for (const teamId of tournament.teams) {
            const notif = await Notification.create({
              team: teamId,
              tournament: tournamentId,
              message: `Bracket updated for "${tournament.name}".`,
              url: `/tournaments/${tournamentId}`,
            });
            io.to(`team_${teamId}`).emit("newNotification", notif);
          }

          io.to(`tournament_${tournamentId}`).emit(
            "tournament:updated",
            tournament
          );
        } catch (err) {
          console.error("updateTournament error:", err);
          socket.emit("error", "Server error updating tournament");
        }
      }
    );
  });
};

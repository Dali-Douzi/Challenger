const jwt = require("jsonwebtoken");
const ScrimChat = require("./models/ScrimChat");
const Scrim = require("./models/Scrim");
const Team = require("./models/Team");
const Notification = require("./models/Notification");
const User = require("./models/User");

module.exports = (io) => {
  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      const err = new Error("Authentication error: token required");
      return next(err);
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

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id} (user ${socket.userId})`);

    /**
     * Join a scrim chat room if user belongs to any involved team
     */
    socket.on("joinRoom", async (scrimId) => {
      try {
        const scrim = await Scrim.findById(scrimId);
        if (!scrim) return socket.emit("error", "Scrim not found");

        // Gather all team IDs with access
        const teamIds = [scrim.teamA.toString()];
        if (Array.isArray(scrim.requests)) {
          scrim.requests.forEach((id) => teamIds.push(id.toString()));
        }
        if (scrim.teamB) teamIds.push(scrim.teamB.toString());

        // Check if user belongs to one of these teams
        let allowed = false;
        for (const tId of teamIds) {
          const team = await Team.findById(tId);
          if (!team) continue;
          if (
            team.owner.toString() === socket.userId ||
            team.members.some((m) => m.user.toString() === socket.userId)
          ) {
            allowed = true;
            break;
          }
        }
        if (!allowed)
          return socket.emit("error", "Not authorized for this chat");

        socket.join(scrimId);
      } catch (err) {
        console.error("joinRoom error:", err);
        socket.emit("error", "Server error joining room");
      }
    });

    /**
     * Handle sending a new chat message and generate notifications
     */
    socket.on("sendMessage", async ({ scrimId, text }) => {
      if (!scrimId || !text) {
        return socket.emit("error", "Scrim ID and text are required");
      }
      try {
        // Ensure the client has joined the room
        if (!io.sockets.adapter.rooms.has(scrimId)) {
          return socket.emit("error", "You must join the room first");
        }

        // Persist the message
        let chat = await ScrimChat.findOne({ scrim: scrimId });
        if (!chat) chat = new ScrimChat({ scrim: scrimId, messages: [] });
        const msg = { sender: socket.userId, text, timestamp: new Date() };
        chat.messages.push(msg);
        await chat.save();

        const senderUser = await User.findById(socket.userId).select(
          "username avatar"
        );

        // Load scrim to identify recipient teams
        const scrim = await Scrim.findById(scrimId);
        const allTeams = [
          scrim.teamA.toString(),
          ...(Array.isArray(scrim.requests)
            ? scrim.requests.map((id) => id.toString())
            : []),
          ...(scrim.teamB ? [scrim.teamB.toString()] : []),
        ];

        // Determine sender's team
        let senderTeam = null;
        for (const tId of allTeams) {
          const team = await Team.findById(tId);
          if (
            team.owner.toString() === socket.userId ||
            team.members.some((m) => m.user.toString() === socket.userId)
          ) {
            senderTeam = tId;
            break;
          }
        }

        // Notify all other teams
        const recipients = allTeams.filter((id) => id !== senderTeam);
        await Promise.all(
          recipients.map((teamId) =>
            Notification.create({
              team: teamId,
              scrim: scrimId,
              chat: chat._id,
              message: text,
              type: "message",
              url: "/chats",
            })
          )
        );

        // Broadcast to room
        io.to(scrimId).emit("newMessage", {
          ...msg, // spreads sender, text, timestamp
          sender: senderUser, // the full user object
        });
      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("error", "Server error sending message");
      }
    });
  });
};

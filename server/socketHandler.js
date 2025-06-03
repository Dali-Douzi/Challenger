// socketHandler.js
const jwt = require("jsonwebtoken");
const ScrimChat = require("./models/ScrimChat");
const Scrim = require("./models/Scrim");
const Team = require("./models/Team");
const Notification = require("./models/Notification");
const User = require("./models/User");

module.exports = (io) => {
  // 1) Authenticate socket connections via JWT
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

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id} (user ${socket.userId})`);

    /**
     * Join a chat thread by chatId.
     * We must check if the user can access that chat’s scrim.
     */
    socket.on("joinRoom", async (chatId) => {
      try {
        if (!chatId) {
          return socket.emit("error", "Chat ID is required");
        }
        // 1) Load the chat doc
        const chat = await ScrimChat.findById(chatId);
        if (!chat) return socket.emit("error", "Chat not found");

        // 2) Load the parent scrim for permission check
        const scrim = await Scrim.findById(chat.scrim);
        if (!scrim) return socket.emit("error", "Scrim not found");

        // Gather all team IDs with access
        const teamIds = [scrim.teamA.toString()];
        if (Array.isArray(scrim.requests)) {
          scrim.requests.forEach((id) => teamIds.push(id.toString()));
        }
        if (scrim.teamB) teamIds.push(scrim.teamB.toString());

        // Check if this user belongs to any of those teams
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

        // 3) If allowed, join the room named after chatId
        socket.join(chatId);
      } catch (err) {
        console.error("joinRoom error:", err);
        socket.emit("error", "Server error joining room");
      }
    });

    /**
     * When client does `socket.emit("sendMessage", { chatId, text })`
     */
    socket.on("sendMessage", async ({ chatId, text }) => {
      if (!chatId || !text) {
        return socket.emit("error", "chatId and text are required");
      }
      try {
        // 1) Ensure the client has joined the room
        if (!io.sockets.adapter.rooms.has(chatId)) {
          return socket.emit("error", "You must join the room first");
        }

        // 2) Load the chat doc
        let chat = await ScrimChat.findById(chatId);
        if (!chat) return socket.emit("error", "Chat not found");

        // 3) Load the parent scrim to identify recipients
        const scrim = await Scrim.findById(chat.scrim);
        if (!scrim) return socket.emit("error", "Scrim not found");

        const msg = { sender: socket.userId, text, timestamp: new Date() };
        chat.messages.push(msg);
        await chat.save();

        // 4) Populate sender’s username/avatar for broadcast
        const senderUser = await User.findById(socket.userId).select(
          "username avatar"
        );

        // 5) Build notifications exactly as before, except store chat: chatId
        const allTeams = [
          scrim.teamA.toString(),
          ...(Array.isArray(scrim.requests)
            ? scrim.requests.map((id) => id.toString())
            : []),
          ...(scrim.teamB ? [scrim.teamB.toString()] : []),
        ];

        // Determine senderTeam
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
        const senderTeamObj = await Team.findById(senderTeam);
        const senderTeamName = senderTeamObj
          ? senderTeamObj.name
          : "Unknown Team";

        const recipients = allTeams.filter((id) => id !== senderTeam);
        await Promise.all(
          recipients.map((teamId) =>
            Notification.create({
              team: teamId,
              scrim: scrim._id,
              chat: chat._id,
              message: `New message from ${senderTeamName}: ${text}`,
              type: "message",
              url: `/chats/${chat._id}`, // link to THIS chat thread
            })
          )
        );

        // 6) Broadcast the new message to everyone in “room = chatId”
        io.to(chatId).emit("newMessage", {
          ...msg,
          sender: senderUser,
        });

        console.log(
          `💬 Message sent in chat ${chatId} by user ${socket.userId}`
        );
      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("error", "Server error sending message");
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
};

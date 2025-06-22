const jwt = require("jsonwebtoken");
const ScrimChat = require("./models/ScrimChat");
const Scrim = require("./models/Scrim");
const Team = require("./models/Team");
const Notification = require("./models/Notification");
const User = require("./models/User");

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: token required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId; // FIX: Use correct field from JWT
      return next();
    } catch (err) {
      console.error("🔒 Socket auth failed:", err.message);
      return next(new Error("Authentication error"));
    }
  });

  const canAccessChat = async (userId, scrim) => {
    const teamIds = [scrim.teamA.toString()];

    if (Array.isArray(scrim.requests) && scrim.requests.length) {
      scrim.requests.forEach((id) => teamIds.push(id.toString()));
    }
    if (scrim.teamB) {
      teamIds.push(scrim.teamB.toString());
    }

    for (const tId of teamIds) {
      const team = await Team.findById(tId);
      if (!team) continue;
      if (
        team.owner.toString() === userId ||
        team.members.some((m) => m.user.toString() === userId)
      ) {
        return true;
      }
    }
    return false;
  };

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id} (user ${socket.userId})`);

    socket.on("joinRoom", async (chatId) => {
      try {
        if (!chatId) {
          return socket.emit("error", {
            message: "Chat ID is required",
            code: "MISSING_CHAT_ID",
          });
        }

        const chat = await ScrimChat.findById(chatId);
        if (!chat) {
          return socket.emit("error", {
            message: "Chat not found",
            code: "CHAT_NOT_FOUND",
          });
        }

        const scrim = await Scrim.findById(chat.scrim);
        if (!scrim) {
          return socket.emit("error", {
            message: "Scrim not found",
            code: "SCRIM_NOT_FOUND",
          });
        }

        const hasAccess = await canAccessChat(socket.userId, scrim);
        if (!hasAccess) {
          return socket.emit("error", {
            message: "Not authorized for this chat",
            code: "UNAUTHORIZED",
          });
        }

        socket.join(chatId);
        socket.emit("joinedRoom", {
          chatId,
          message: "Successfully joined chat",
        });

        console.log(`💬 User ${socket.userId} joined chat room ${chatId}`);
      } catch (err) {
        console.error("🔥 joinRoom error:", err);
        socket.emit("error", {
          message: "Server error joining room",
          code: "SERVER_ERROR",
        });
      }
    });

    socket.on("sendMessage", async ({ chatId, text }) => {
      try {
        if (!chatId || !text?.trim()) {
          return socket.emit("error", {
            message: "Chat ID and message text are required",
            code: "MISSING_REQUIRED_FIELDS",
          });
        }

        // Validate message length
        if (text.trim().length > 1000) {
          return socket.emit("error", {
            message: "Message too long (max 1000 characters)",
            code: "MESSAGE_TOO_LONG",
          });
        }

        // Check if socket is in the room
        if (!socket.rooms.has(chatId)) {
          return socket.emit("error", {
            message: "You must join the room first",
            code: "NOT_IN_ROOM",
          });
        }

        const chat = await ScrimChat.findById(chatId);
        if (!chat) {
          return socket.emit("error", {
            message: "Chat not found",
            code: "CHAT_NOT_FOUND",
          });
        }

        const scrim = await Scrim.findById(chat.scrim);
        if (!scrim) {
          return socket.emit("error", {
            message: "Scrim not found",
            code: "SCRIM_NOT_FOUND",
          });
        }

        // Double-check access (security)
        const hasAccess = await canAccessChat(socket.userId, scrim);
        if (!hasAccess) {
          return socket.emit("error", {
            message: "Not authorized",
            code: "UNAUTHORIZED",
          });
        }

        // Create and save message
        const messageData = {
          sender: socket.userId,
          text: text.trim(),
          timestamp: new Date(),
        };

        chat.messages.push(messageData);
        await chat.save();

        // Get sender info for broadcast
        const senderUser = await User.findById(socket.userId).select(
          "username avatar"
        );
        if (!senderUser) {
          return socket.emit("error", {
            message: "User not found",
            code: "USER_NOT_FOUND",
          });
        }

        // Determine all teams involved
        const allTeams = [scrim.teamA.toString()];
        if (Array.isArray(scrim.requests)) {
          scrim.requests.forEach((id) => allTeams.push(id.toString()));
        }
        if (scrim.teamB) {
          allTeams.push(scrim.teamB.toString());
        }

        // Find sender's team
        let senderTeam = null;
        for (const tId of allTeams) {
          const team = await Team.findById(tId);
          if (!team) continue;
          if (
            team.owner.toString() === socket.userId ||
            team.members.some((m) => m.user.toString() === socket.userId)
          ) {
            senderTeam = team;
            break;
          }
        }

        if (!senderTeam) {
          return socket.emit("error", {
            message: "Sender team not found",
            code: "TEAM_NOT_FOUND",
          });
        }

        // Create notifications for other teams
        const recipientTeams = allTeams.filter(
          (id) => id !== senderTeam._id.toString()
        );
        const notifications = await Promise.all(
          recipientTeams.map(async (teamId) => {
            const notification = await Notification.create({
              team: teamId,
              scrim: scrim._id,
              chat: chat._id,
              message: `New message from ${senderTeam.name}: ${text.trim()}`,
              type: "message",
              url: `/chats/${chat._id}`,
            });

            // Emit notification to specific team
            io.emit("newNotification", {
              teamId: teamId,
              notification: notification,
            });

            return notification;
          })
        );

        // Broadcast message to all users in chat room
        const messageForBroadcast = {
          ...messageData,
          sender: senderUser,
          _id: chat.messages[chat.messages.length - 1]._id, // Get the ID from saved message
        };

        io.to(chatId).emit("newMessage", messageForBroadcast);

        // Confirm message sent to sender
        socket.emit("messageSent", {
          messageId: messageForBroadcast._id,
          timestamp: messageData.timestamp,
        });

        console.log(
          `💬 Message sent in chat ${chatId} by ${senderUser.username} (${socket.userId})`
        );
      } catch (err) {
        console.error("🔥 sendMessage error:", err);
        socket.emit("error", {
          message: "Server error sending message",
          code: "SERVER_ERROR",
          details:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }
    });

    socket.on("leaveRoom", (chatId) => {
      if (chatId && socket.rooms.has(chatId)) {
        socket.leave(chatId);
        socket.emit("leftRoom", { chatId });
        console.log(`👋 User ${socket.userId} left chat room ${chatId}`);
      }
    });

    socket.on("typing", ({ chatId, isTyping }) => {
      if (chatId && socket.rooms.has(chatId)) {
        socket.to(chatId).emit("userTyping", {
          userId: socket.userId,
          isTyping: isTyping,
          timestamp: new Date(),
        });
      }
    });

    socket.on("markMessagesRead", async ({ chatId }) => {
      try {
        if (!chatId) return;

        // Mark notifications as read for this user's teams in this chat
        const userTeams = await Team.find({
          $or: [{ owner: socket.userId }, { "members.user": socket.userId }],
        }).select("_id");

        const teamIds = userTeams.map((team) => team._id);

        await Notification.updateMany(
          {
            chat: chatId,
            team: { $in: teamIds },
            read: false,
          },
          { read: true }
        );

        socket.emit("messagesMarkedRead", { chatId });
        console.log(
          `📖 Messages marked as read in chat ${chatId} for user ${socket.userId}`
        );
      } catch (err) {
        console.error("🔥 markMessagesRead error:", err);
        socket.emit("error", {
          message: "Error marking messages as read",
          code: "MARK_READ_ERROR",
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `🔴 Socket disconnected: ${socket.id} (user ${socket.userId}) - Reason: ${reason}`
      );
    });

    socket.on("error", (err) => {
      console.error(`🔥 Socket error for user ${socket.userId}:`, err);
    });
  });

  // Handle global Socket.IO errors
  io.engine.on("connection_error", (err) => {
    console.error("🔥 Socket.IO connection error:", err);
  });

  console.log(
    "✅ Socket.IO handler initialized with perfected error handling and features"
  );
};

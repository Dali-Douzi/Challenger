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
     * Join a chat room by its Chat ID (not the scrim ID).
     * Ensures the user’s team is either owner or challenger.
     */
    socket.on("joinRoom", async (scrimId) => {
      try {
        // Load the scrim and find the chat thread for this user
        const scrim = await Scrim.findById(scrimId);
        if (!scrim) return socket.emit("error", "Scrim not found");

        // Build list of this user’s team IDs
        const teams = await Team.find({
          $or: [{ owner: socket.userId }, { "members.user": socket.userId }],
        }).select("_id");
        const teamIds = teams.map((t) => t._id.toString());

        // Fetch the one-to-one chat thread
        const chat = await ScrimChat.findOne({
          scrim,
          $or: [{ owner: { $in: teamIds } }, { challenger: { $in: teamIds } }],
        });
        if (!chat) {
          return socket.emit("error", "Chat thread not created");
        }

        // Join the room named after the Chat’s _id
        socket.join(chat._id.toString());
      } catch (err) {
        console.error("joinRoom error:", err);
        socket.emit("error", "Server error joining room");
      }
    });

    /**
     * Handle sending a new message.
     * Broadcasts to the Chat ID room, and notifies the other team.
     */
    socket.on("sendMessage", async ({ scrimId, text }) => {
      if (!scrimId || !text) {
        return socket.emit("error", "Scrim ID and text are required");
      }
      try {
        // Find this user’s team IDs
        const teams = await Team.find({
          $or: [{ owner: socket.userId }, { "members.user": socket.userId }],
        }).select("_id");
        const teamIds = teams.map((t) => t._id.toString());

        // Fetch the chat for this scrim scoped to the user
        const chat = await ScrimChat.findOne({
          scrim: mongoose.Types.ObjectId(scrimId),
          $or: [{ owner: { $in: teamIds } }, { challenger: { $in: teamIds } }],
        });
        if (!chat) {
          return socket.emit("error", "Chat thread not found");
        }

        const room = chat._id.toString();
        // Ensure the client has joined the correct chat room
        if (!io.sockets.adapter.rooms.has(room)) {
          return socket.emit("error", "You must join the room first");
        }

        // Persist the message
        const msg = {
          sender: socket.userId,
          text,
          timestamp: new Date(),
        };
        chat.messages.push(msg);
        await chat.save();

        // Populate sender details for broadcast
        const senderUser = await User.findById(socket.userId).select(
          "username avatar"
        );

        // Determine the recipient team(s): chat.owner and chat.challenger
        const recipientTeamIds = [
          chat.owner.toString(),
          chat.challenger.toString(),
        ].filter((tid) => tid !== teamIds.find((id) => id === tid));

        // Create notifications for the other party
        await Promise.all(
          recipientTeamIds.map((teamId) =>
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

        // Broadcast to the chat room
        io.to(room).emit("newMessage", {
          ...msg,
          sender: senderUser,
        });
      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("error", "Server error sending message");
      }
    });
  });
};

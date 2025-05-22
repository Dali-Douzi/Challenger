const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const gameRoutes = require("./routes/gameRoutes");
const seedGames = require("./config/dbSeeder");
const scrimRoutes = require("./routes/scrimRoutes");
const scrimChatRoutes = require("./routes/scrimChatRoutes");
const Scrim = require("./models/Scrim");
const ScrimChat = require("./models/ScrimChat");
const notificationRoutes = require("./routes/notificationRoutes");
const app = express();

dotenv.config();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' 'strict-dynamic'"
  );
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/scrims", scrimRoutes);
app.use("/api/scrims/chat", scrimChatRoutes);
app.use("/api/notifications", notificationRoutes);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    console.log("✅ MongoDB Connected");
    await seedGames();
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 4444;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use("/api/notifications", notificationRoutes);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinRoom", async (scrimId) => {
    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return socket.emit("error", "Scrim not found");

    const isTeamA = scrim.teamA.toString() === socket.userId;
    const isRequester = scrim.requests
      .map((id) => id.toString())
      .includes(socket.userId);

    if (!isTeamA && !isRequester) {
      return socket.emit("error", "Not authorized for this chat");
    }

    socket.join(scrimId);
  });

  socket.on("sendMessage", async ({ scrimId, text }) => {
    if (!io.sockets.adapter.rooms.has(scrimId)) {
      return socket.emit("error", "You must join the room first");
    }

    const chat = await ScrimChat.findOne({ scrim: scrimId });
    if (!chat) return socket.emit("error", "Chat not initialized");

    const msg = {
      sender: socket.userId,
      text,
      timestamp: new Date(),
    };

    chat.messages.push(msg);
    await chat.save();

    io.to(scrimId).emit("newMessage", msg);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const gameRoutes = require("./routes/gameRoutes");
const seedGames = require("./config/dbSeeder");
const scrimRoutes = require("./routes/scrimRoutes");
const scrimChatRoutes = require("./routes/scrimChatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config();

const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Security headers
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' 'strict-dynamic'"
  );
  next();
});

// —————— NEW: Serve uploaded avatars statically ——————
// Makes files under /uploads/avatars accessible at http://<host>/uploads/avatars/...
app.use(
  "/uploads/avatars",
  express.static(path.join(__dirname, "uploads/avatars"))
);

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/scrims/chat", scrimChatRoutes);
app.use("/api/scrims", scrimRoutes);
app.use("/api/notifications", notificationRoutes);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    console.log("✅ MongoDB Connected");
    // Seed initial game data
    await seedGames();
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};
connectDB();

// Create HTTP and Socket.IO servers
const PORT = process.env.PORT || 4444;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Delegate all Socket.IO logic to socketHandler.js
require("./socketHandler")(io);

// Start listening
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

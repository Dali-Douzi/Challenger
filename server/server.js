const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const gameRoutes = require("./routes/gameRoutes");
const scrimRoutes = require("./routes/scrimRoutes");
const chatListRoutes = require("./routes/chatListRoutes");
const scrimChatRoutes = require("./routes/scrimChatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const matchRoutes = require("./routes/matchRoutes");

// Import cleanup utilities
const {
  schedulePeriodicCleanup,
  getCleanupStats,
  runCompleteCleanup,
} = require("./utils/notificationCleanup");

const seedGames = require("./config/dbSeeder");

dotenv.config();

const app = express();

// Create upload directories
const avatarUploadDir = path.join(__dirname, "uploads/avatars");
const logoUploadDir = path.join(__dirname, "uploads/logos");

if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

if (!fs.existsSync(logoUploadDir)) {
  fs.mkdirSync(logoUploadDir, { recursive: true });
}

// Avatar upload configuration
const avatarStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, avatarUploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}${ext}`);
  },
});

// Logo upload configuration
const logoStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, logoUploadDir);
  },
  filename(req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Create multer instances
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const logoUpload = multer({
  storage: logoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Make multer instances available to routes
app.set("avatarUpload", avatarUpload);
app.set("logoUpload", logoUpload);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl}`);
  next();
});

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/chats", chatListRoutes);
app.use("/api/scrims/chats", scrimChatRoutes);
app.use("/api/scrims", scrimRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/matches", matchRoutes);

// Connect to MongoDB
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

app.set("io", io);
// Delegate all Socket.IO logic to socketHandler.js
require("./socketHandler")(io);

// Start listening
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

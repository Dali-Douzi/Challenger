const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cron = require("node-cron");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const scrimRoutes = require("./routes/scrimRoutes");
const seedGames = require("./config/dbSeeder");

const app = express();
const PORT = process.env.PORT || 4444;

// Orphaned Objects Cleanup System
class OrphanedCleanup {
  static async cleanup(options = { dryRun: false, verbose: false }) {
    const { dryRun, verbose } = options;
    const results = {
      orphanedTeams: [],
      orphanedScrims: [],
      cleanedNotifications: 0,
      cleanedChats: 0,
      errors: [],
    };

    if (verbose) {
      console.log("🧹 Starting orphaned objects cleanup...");
      console.log(`📋 Mode: ${dryRun ? "DRY RUN" : "LIVE CLEANUP"}`);
    }

    try {
      const Team = require("./models/Team");
      const Scrim = require("./models/Scrim");
      const User = require("./models/User");
      const Notification = require("./models/Notification");
      const ScrimChat = require("./models/ScrimChat");

      // 1. Clean orphaned teams (no valid owner or members)
      const teams = await Team.find({})
        .populate("owner", "_id")
        .populate("members.user", "_id");

      for (const team of teams) {
        let isOrphaned = false;
        let reason = "";

        if (!team.owner) {
          isOrphaned = true;
          reason = "Owner deleted";
        } else {
          const validMembers = team.members.filter((member) => member.user);
          if (validMembers.length === 0) {
            isOrphaned = true;
            reason = "All members deleted";
          }
        }

        if (isOrphaned) {
          results.orphanedTeams.push({
            teamId: team._id,
            teamName: team.name,
            reason: reason,
          });

          if (!dryRun) {
            // Remove from users' teams arrays
            await User.updateMany(
              { teams: team._id },
              { $pull: { teams: team._id } }
            );

            // Delete orphaned scrims where this team was teamA
            const orphanedScrims = await Scrim.find({ teamA: team._id });
            for (const scrim of orphanedScrims) {
              await ScrimChat.deleteMany({ scrim: scrim._id });
              await Notification.deleteMany({ scrim: scrim._id });
              await Scrim.findByIdAndDelete(scrim._id);
            }

            // Remove team from other scrims' requests
            await Scrim.updateMany(
              { requests: team._id },
              { $pull: { requests: team._id } }
            );

            // Delete team
            await Team.findByIdAndDelete(team._id);
          }

          if (verbose) {
            console.log(
              `🗑️ ${dryRun ? "Found" : "Deleted"} orphaned team: ${
                team.name
              } (${reason})`
            );
          }
        }
      }

      // 2. Clean orphaned scrims (teamA deleted - posting team)
      const scrims = await Scrim.find({})
        .populate("teamA", "_id name")
        .populate("teamB", "_id name");

      for (const scrim of scrims) {
        let isOrphaned = false;
        let reason = "";

        // Only check teamA (posting team) - if teamA is deleted, scrim is orphaned
        if (!scrim.teamA) {
          isOrphaned = true;
          reason = "Posting team (teamA) deleted";
        }

        if (isOrphaned) {
          results.orphanedScrims.push({
            scrimId: scrim._id,
            reason: reason,
            status: scrim.status,
          });

          if (!dryRun) {
            // Delete related chat and notifications
            await ScrimChat.deleteMany({ scrim: scrim._id });
            const deletedNotifications = await Notification.deleteMany({
              scrim: scrim._id,
            });
            results.cleanedNotifications += deletedNotifications.deletedCount;

            // Delete scrim
            await Scrim.findByIdAndDelete(scrim._id);
          }

          if (verbose) {
            console.log(
              `🗑️ ${dryRun ? "Found" : "Deleted"} orphaned scrim: ${
                scrim._id
              } (${reason})`
            );
          }
        } else {
          // Clean up requests array from deleted teams (but don't delete scrim)
          if (scrim.requests && scrim.requests.length > 0) {
            const validRequests = [];
            for (const teamId of scrim.requests) {
              const team = await Team.findById(teamId);
              if (team) validRequests.push(teamId);
            }

            if (validRequests.length < scrim.requests.length && !dryRun) {
              scrim.requests = validRequests;
              await scrim.save();
              if (verbose) {
                console.log(
                  `🧹 Cleaned deleted teams from scrim requests: ${scrim._id}`
                );
              }
            }
          }
        }
      }

      // 3. Clean orphaned notifications and chats
      if (!dryRun) {
        const orphanedNotifications = await Notification.find({})
          .populate("team", "_id")
          .populate("scrim", "_id");

        for (const notification of orphanedNotifications) {
          if (
            !notification.team ||
            (notification.scrim && !notification.scrim)
          ) {
            await Notification.findByIdAndDelete(notification._id);
            results.cleanedNotifications++;
          }
        }

        const orphanedChats = await ScrimChat.find({}).populate("scrim", "_id");
        for (const chat of orphanedChats) {
          if (!chat.scrim) {
            await ScrimChat.findByIdAndDelete(chat._id);
            results.cleanedChats++;
          }
        }
      }

      if (verbose) {
        console.log("✅ Cleanup completed successfully");
        console.log(
          `📊 Teams: ${results.orphanedTeams.length}, Scrims: ${results.orphanedScrims.length}`
        );
      }

      return results;
    } catch (error) {
      results.errors.push(error.message);
      if (verbose) console.error("❌ Cleanup failed:", error);
      throw error;
    }
  }
}

// Cleanup scheduler
let cleanupTask = null;

const startCleanupScheduler = () => {
  if (cleanupTask) {
    console.log("⚠️ Cleanup scheduler already running");
    return;
  }

  // Schedule daily at 2:00 AM UTC
  cleanupTask = cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        console.log("🧹 Running scheduled orphaned objects cleanup...");
        const results = await OrphanedCleanup.cleanup({
          dryRun: false,
          verbose: true,
        });

        if (
          results.orphanedTeams.length > 0 ||
          results.orphanedScrims.length > 0
        ) {
          console.log(
            `📊 Scheduled cleanup: ${results.orphanedTeams.length} teams, ${results.orphanedScrims.length} scrims removed`
          );
        }
      } catch (error) {
        console.error("❌ Scheduled cleanup failed:", error);
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  console.log("🕐 Cleanup scheduler started - daily at 2:00 AM UTC");
};

// Trust proxy for accurate client IPs behind reverse proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Compression middleware for better performance
app.use(compression());

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Cookie parser middleware (required for production auth)
app.use(cookieParser());

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static files and health checks
    return req.url.startsWith("/uploads") || req.url === "/health";
  },
});

app.use(generalLimiter);

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.CLIENT_URL,
      "http://localhost:5173", // Development
      "http://localhost:3000", // Alternative development port
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Required for cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      // Store raw body for webhook verification if needed
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Database connection with improved error handling
const connectDB = async () => {
  try {
    const mongoOptions = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/challenger",
      mongoOptions
    );

    console.log(`🍃 MongoDB connected successfully: ${conn.connection.host}`);

    // Seed games after successful connection (only in development)
    if (process.env.NODE_ENV !== "production") {
      try {
        await seedGames();
        console.log("📊 Database seeding completed");
      } catch (error) {
        console.error("❌ Error seeding database:", error);
      }
    }

    // Start cleanup scheduler
    startCleanupScheduler();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Initialize database connection
connectDB();

// Health check endpoint with cleanup status
app.get("/health", async (req, res) => {
  const healthCheck = {
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    memory: process.memoryUsage(),
    mongoStatus:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  };

  // Add cleanup scheduler status
  try {
    healthCheck.cleanupScheduler = {
      isScheduled: !!cleanupTask,
      schedule: "Daily at 2:00 AM UTC",
    };
  } catch (error) {
    healthCheck.cleanupScheduler = { error: "Failed to get status" };
  }

  // Check database collections count
  try {
    const [usersCount, teamsCount, scrimsCount] = await Promise.all([
      mongoose.model("User").countDocuments(),
      mongoose.model("Team").countDocuments(),
      mongoose.model("Scrim").countDocuments(),
    ]);

    healthCheck.database = {
      users: usersCount,
      teams: teamsCount,
      scrims: scrimsCount,
    };
  } catch (error) {
    healthCheck.database = { error: "Failed to get counts" };
  }

  // Check if we're in production and have required env vars
  if (process.env.NODE_ENV === "production") {
    const requiredEnvVars = [
      "JWT_SECRET",
      "MONGO_URI",
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      healthCheck.success = false;
      healthCheck.message = "Missing required environment variables";
      healthCheck.missingEnvVars = missingEnvVars;
      return res.status(500).json(healthCheck);
    }
  }

  res.json(healthCheck);
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/scrims", scrimRoutes);

// Cleanup routes
app.get("/api/cleanup/status", async (req, res) => {
  try {
    const status = {
      isScheduled: !!cleanupTask,
      schedule: "Daily at 2:00 AM UTC",
      lastRun: "Check server logs",
    };
    res.json({ success: true, data: status });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error getting cleanup status" });
  }
});

app.post("/api/cleanup/dry-run", async (req, res) => {
  try {
    const results = await OrphanedCleanup.cleanup({
      dryRun: true,
      verbose: false,
    });
    res.json({
      success: true,
      message: "Dry run completed - no changes made",
      data: results,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Cleanup dry run failed",
        error: error.message,
      });
  }
});

app.post("/api/cleanup/run", async (req, res) => {
  try {
    const results = await OrphanedCleanup.cleanup({
      dryRun: false,
      verbose: true,
    });
    res.json({
      success: true,
      message: "Manual cleanup completed",
      data: results,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Manual cleanup failed",
        error: error.message,
      });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Challenger API is running!",
    version: "2.0.0",
    features: [
      "Cookie-based authentication",
      "Cloudinary file storage",
      "Rate limiting",
      "Security headers",
      "Auto token refresh",
      "Orphaned objects cleanup",
    ],
    endpoints: [
      "/api/auth",
      "/api/teams",
      "/api/scrims",
      "/api/teams/games",
      "/api/cleanup",
      "/health",
    ],
  });
});

// Manual seeding endpoint (development only)
app.get("/api/seed-games", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      message: "Seeding is not allowed in production",
    });
  }

  try {
    await seedGames();
    res.json({
      success: true,
      message: "Games seeded successfully",
    });
  } catch (error) {
    console.error("❌ Seeding error:", error);
    res.status(500).json({
      success: false,
      message: "Seeding failed",
      error: error.message,
    });
  }
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    features: {
      cookies: !!req.cookies,
      cors: true,
      security: true,
      compression: true,
      cleanup: !!cleanupTask,
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🚨 Global error handler:", {
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation - origin not allowed",
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large",
    });
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      timestamp: new Date().toISOString(),
    }),
  });
});

// 404 handler for unknown routes
app.use("*", (req, res) => {
  console.log(`🔍 404 - Route not found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "GET /",
      "GET /health",
      "GET /api/test",
      "GET /api/games",
      "GET /api/cleanup/status",
      "POST /api/cleanup/dry-run",
      "POST /api/cleanup/run",
      "POST /api/auth/login",
      "POST /api/auth/signup",
      "POST /api/auth/logout",
      "POST /api/auth/refresh",
      "DELETE /api/auth/delete-account",
      "GET /api/auth/me",
      "GET /api/teams/my",
      "POST /api/auth/login",
    ],
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);

  // Stop cleanup scheduler
  if (cleanupTask) {
    cleanupTask.stop();
    console.log("🧹 Cleanup scheduler stopped");
  }

  // Close server
  const server = app.listen(PORT);
  server.close(() => {
    console.log("🔌 HTTP server closed");

    // Close database connection
    mongoose.connection.close(() => {
      console.log("🍃 MongoDB connection closed");
      console.log("👋 Process terminated gracefully");
      process.exit(0);
    });
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error(
      "⚠️ Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔐 Authentication: Cookie-based`);
  console.log(`☁️ File Storage: Cloudinary`);
  console.log(`🛡️ Security: Enabled`);
  console.log(`🧹 Cleanup Scheduler: Enabled`);
  console.log("📍 Registered routes:");
  console.log("   • Auth routes: /api/auth");
  console.log("   • Team routes: /api/teams");
  console.log("   • Scrim routes: /api/scrims");
  console.log("   • Cleanup routes: /api/cleanup");
  console.log("   • Games route: /api/games");
  console.log("   • Health check: /health");

  if (process.env.NODE_ENV === "production") {
    console.log("🔥 Production mode - optimizations enabled");
  } else {
    console.log("🔧 Development mode - debug features enabled");
  }
});

// Set server timeout
server.timeout = 30000; // 30 seconds

module.exports = app;

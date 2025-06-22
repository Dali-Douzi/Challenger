const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cron = require("node-cron");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const teamRoutes = require("./routes/teamRoutes");
const scrimRoutes = require("./routes/scrimRoutes");
const seedGames = require("./config/dbSeeder");

const app = express();
const PORT = process.env.PORT || 4444;
let cleanupTask = null;

const SCRIM_RETENTION_DAYS = parseInt(process.env.SCRIM_RETENTION_DAYS) || 90;

class OrphanedCleanup {
  static async cleanup(options = { dryRun: false, verbose: false }) {
    const { dryRun, verbose } = options;
    const results = {
      orphanedTeams: [],
      orphanedScrims: [],
      cleanedNotifications: 0,
      cleanedChats: 0,
      cleanedOldScrims: 0,
      errors: [],
    };

    if (verbose) {
      console.log("🧹 Starting cleanup...");
      console.log(`📋 Mode: ${dryRun ? "DRY RUN" : "LIVE CLEANUP"}`);
      console.log(`📅 Scrim retention: ${SCRIM_RETENTION_DAYS} days`);
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
            await User.updateMany(
              { teams: team._id },
              { $pull: { teams: team._id } }
            );

            const orphanedScrims = await Scrim.find({ teamA: team._id });
            for (const scrim of orphanedScrims) {
              await ScrimChat.deleteMany({ scrim: scrim._id });
              await Notification.deleteMany({ scrim: scrim._id });
              await Scrim.findByIdAndDelete(scrim._id);
            }

            await Scrim.updateMany(
              { requests: team._id },
              { $pull: { requests: team._id } }
            );

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
            await ScrimChat.deleteMany({ scrim: scrim._id });
            const deletedNotifications = await Notification.deleteMany({
              scrim: scrim._id,
            });
            results.cleanedNotifications += deletedNotifications.deletedCount;

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

      // 3. Clean old scrims and all related data (90+ days old)
      const scrimCutoff = new Date(
        Date.now() - SCRIM_RETENTION_DAYS * 24 * 60 * 60 * 1000
      );

      const oldScrims = await Scrim.find({
        createdAt: { $lt: scrimCutoff },
      });

      if (!dryRun) {
        for (const scrim of oldScrims) {
          await ScrimChat.deleteMany({ scrim: scrim._id });
          await Notification.deleteMany({ scrim: scrim._id });
        }

        const deletedOldScrims = await Scrim.deleteMany({
          createdAt: { $lt: scrimCutoff },
        });
        results.cleanedOldScrims = deletedOldScrims.deletedCount;
      } else {
        results.cleanedOldScrims = oldScrims.length;
      }

      // 4. Clean any remaining orphaned notifications and chats (safety net)
      if (!dryRun) {
        const orphanedNotifications = await Notification.deleteMany({
          scrim: { $exists: false },
        });
        results.cleanedNotifications += orphanedNotifications.deletedCount;

        const orphanedChats = await ScrimChat.deleteMany({
          scrim: { $exists: false },
        });
        results.cleanedChats += orphanedChats.deletedCount;
      }

      if (verbose) {
        console.log("✅ Cleanup completed successfully");
        console.log("📊 Cleanup Results:");
        console.log(`   • Orphaned Teams: ${results.orphanedTeams.length}`);
        console.log(`   • Orphaned Scrims: ${results.orphanedScrims.length}`);
        console.log(`   • Old Scrims (90+ days): ${results.cleanedOldScrims}`);
        console.log(
          `   • Orphaned Notifications: ${results.cleanedNotifications}`
        );
        console.log(`   • Orphaned Chats: ${results.cleanedChats}`);
      }

      return results;
    } catch (error) {
      results.errors.push(error.message);
      if (verbose) console.error("❌ Cleanup failed:", error);
      throw error;
    }
  }
}

const startCleanupScheduler = () => {
  if (cleanupTask) {
    console.log("⚠️ Cleanup scheduler already running");
    return;
  }

  cleanupTask = cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        console.log("🧹 Running scheduled comprehensive cleanup...");
        const results = await OrphanedCleanup.cleanup({
          dryRun: false,
          verbose: true,
        });

        const totalCleaned =
          results.orphanedTeams.length +
          results.orphanedScrims.length +
          results.cleanedOldScrims;

        if (totalCleaned > 0) {
          console.log(
            `📊 Scheduled cleanup completed: ${totalCleaned} items removed`
          );
        } else {
          console.log(
            "✨ Scheduled cleanup completed: No items needed removal"
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
  console.log(`📅 Scrim retention: ${SCRIM_RETENTION_DAYS} days`);
};

const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);

  if (cleanupTask) {
    cleanupTask.stop();
    console.log("🧹 Cleanup scheduler stopped");
  }

  const server = app.listen(PORT);
  server.close(() => {
    console.log("🔌 HTTP server closed");

    mongoose.connection.close(() => {
      console.log("🍃 MongoDB connection closed");
      console.log("👋 Process terminated gracefully");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error(
      "⚠️ Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 30000);
};

const connectDB = async () => {
  try {
    const mongoOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/challenger",
      mongoOptions
    );

    console.log(`🍃 MongoDB connected successfully: ${conn.connection.host}`);

    try {
      await seedGames();
      console.log("📊 Database seeding completed");
    } catch (error) {
      if (error.message.includes("already exists") || error.code === 11000) {
        console.log("📊 Database already seeded, skipping");
      } else {
        console.error("❌ Error seeding database:", error);
      }
    }

    startCleanupScheduler();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(compression());

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

app.use(cookieParser());

// Session middleware for OAuth (must be before passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || "mongodb://localhost:27017/challenger",
      touchAfter: 24 * 3600, // lazy session update
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  })
);

// Initialize passport after session
const passport = require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.url.startsWith("/uploads") || req.url === "/health";
  },
});

app.use(generalLimiter);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:3000",
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

connectDB();

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

  try {
    healthCheck.cleanupScheduler = {
      isScheduled: !!cleanupTask,
      schedule: "Daily at 2:00 AM UTC",
      scrimRetentionDays: SCRIM_RETENTION_DAYS,
    };

    healthCheck.oauthProviders = {
      google: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
      discord: !!(
        process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ),
      twitch: !!(
        process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
      ),
    };
  } catch (error) {
    healthCheck.cleanupScheduler = { error: "Failed to get status" };
  }

  try {
    const [
      usersCount,
      teamsCount,
      scrimsCount,
      notificationsCount,
      chatsCount,
    ] = await Promise.all([
      mongoose.model("User").countDocuments(),
      mongoose.model("Team").countDocuments(),
      mongoose.model("Scrim").countDocuments(),
      mongoose.model("Notification").countDocuments(),
      mongoose.model("ScrimChat").countDocuments(),
    ]);

    healthCheck.database = {
      users: usersCount,
      teams: teamsCount,
      scrims: scrimsCount,
      notifications: notificationsCount,
      chatMessages: chatsCount,
    };
  } catch (error) {
    healthCheck.database = { error: "Failed to get counts" };
  }

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

app.get("/", (req, res) => {
  res.json({
    message: "Challenger API is running!",
    version: "2.1.0",
    features: [
      "Cookie-based authentication",
      "OAuth integration (Google, Discord, Twitch)",
      "Cloudinary file storage",
      "Rate limiting",
      "Security headers",
      "Auto token refresh",
      "Automatic data cleanup",
    ],
    endpoints: [
      "/api/auth",
      "/api/auth/google",
      "/api/auth/discord",
      "/api/auth/twitch",
      "/api/teams",
      "/api/scrims",
      "/api/teams/games",
      "/api/cleanup",
      "/health",
    ],
    scrimRetentionDays: SCRIM_RETENTION_DAYS,
  });
});

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
      oauth: {
        google: !!(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ),
        discord: !!(
          process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
        ),
        twitch: !!(
          process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
        ),
      },
    },
    scrimRetentionDays: SCRIM_RETENTION_DAYS,
  });
});

app.get("/api/seed-games", async (req, res) => {
  try {
    await seedGames();
    res.json({
      success: true,
      message: "Games seeded successfully",
    });
  } catch (error) {
    if (error.message.includes("already exists") || error.code === 11000) {
      res.json({
        success: true,
        message: "Games already seeded",
      });
    } else {
      console.error("❌ Seeding error:", error);
      res.status(500).json({
        success: false,
        message: "Seeding failed",
        error: error.message,
      });
    }
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/scrims", scrimRoutes);

app.get("/api/cleanup/status", async (req, res) => {
  try {
    const status = {
      isScheduled: !!cleanupTask,
      schedule: "Daily at 2:00 AM UTC",
      lastRun: "Check server logs",
      scrimRetentionDays: SCRIM_RETENTION_DAYS,
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
      scrimRetentionDays: SCRIM_RETENTION_DAYS,
    });
  } catch (error) {
    res.status(500).json({
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
      scrimRetentionDays: SCRIM_RETENTION_DAYS,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Manual cleanup failed",
      error: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  console.error("🚨 Global error handler:", {
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation - origin not allowed",
    });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: errors,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

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

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large",
    });
  }

  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      timestamp: new Date().toISOString(),
    }),
  });
});

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
      "GET /api/auth/google",
      "GET /api/auth/discord",
      "GET /api/auth/twitch",
      "GET /api/auth/linked-accounts",
      "DELETE /api/auth/unlink/:provider",
      "GET /api/teams/my",
    ],
  });
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔐 Authentication: Cookie-based + OAuth`);
  console.log(`☁️ File Storage: Cloudinary`);
  console.log(`🛡️ Security: Enabled`);
  console.log(`🧹 Cleanup: Enabled (${SCRIM_RETENTION_DAYS} day retention)`);
  console.log("📍 Registered routes:");
  console.log("   • Auth routes: /api/auth");
  console.log(
    "   • OAuth routes: /api/auth/google, /api/auth/discord, /api/auth/twitch"
  );
  console.log("   • Team routes: /api/teams");
  console.log("   • Scrim routes: /api/scrims");
  console.log("   • Cleanup routes: /api/cleanup");
  console.log("   • Games route: /api/games");
  console.log("   • Health check: /health");

  const enabledProviders = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    enabledProviders.push("Google");
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)
    enabledProviders.push("Discord");
  if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)
    enabledProviders.push("Twitch");

  if (enabledProviders.length > 0) {
    console.log(`🔗 OAuth Providers: ${enabledProviders.join(", ")}`);
  } else {
    console.log("⚠️ No OAuth providers configured");
  }

  if (process.env.NODE_ENV === "production") {
    console.log("🔥 Production mode - optimizations enabled");
  } else {
    console.log("🔧 Development mode - debug features enabled");
  }
});

server.timeout = 30000;

module.exports = app;

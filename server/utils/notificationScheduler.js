const cron = require("node-cron");
const Match = require("../models/Match");
const Tournament = require("../models/Tournament");

// This scheduler runs every 5 minutes and notifies teams of upcoming matches 2 hours in advance.
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const windowStart = new Date(now + twoHoursMs);
    const windowEnd = new Date(now + twoHoursMs + 5 * 60 * 1000);

    const upcomingMatches = await Match.find({
      scheduledAt: { $gte: windowStart, $lt: windowEnd },
    })
      .populate("teamA", "name contactInfo")
      .populate("teamB", "name contactInfo");

    for (const match of upcomingMatches) {
      const { teamA, teamB, scheduledAt, tournament } = match;

      // TODO: Replace console.log with real notification logic (email, in-app, etc.)
      console.log(
        `[Notification] Upcoming match in Tournament ${tournament}:
` +
          `  Teams: ${teamA.name} vs ${teamB.name}
` +
          `  Scheduled at: ${scheduledAt.toISOString()}
` +
          `  Notifying contacts: ${teamA.contactInfo}, ${teamB.contactInfo}`
      );
    }
  } catch (err) {
    console.error("Notification scheduler error:", err);
  }
});

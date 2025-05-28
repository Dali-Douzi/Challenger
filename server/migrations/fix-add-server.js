require("dotenv").config(); // loads your MONGO_URI from .env
const mongoose = require("mongoose");
const Team = require("../models/Team");

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Update all teams that lack a server field.
    // Replace "NA" below with whatever default or mapping you need.
    const result = await Team.updateMany(
      { server: { $exists: false } },
      { $set: { server: "NA" } }
    );

    console.log(
      `✔️  Matched ${result.matchedCount}, modified ${result.modifiedCount} teams.`
    );
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();

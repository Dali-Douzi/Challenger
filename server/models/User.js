const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String },
    teams: { type: Array },

    googleId: { type: String, sparse: true, unique: true },
    discordId: { type: String, sparse: true, unique: true },
    twitchId: { type: String, sparse: true, unique: true },

    authProvider: {
      type: String,
      enum: ["local", "google", "discord", "twitch"],
      default: "local",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

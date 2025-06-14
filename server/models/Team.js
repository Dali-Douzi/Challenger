const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
    rank: { type: String, required: true },
    teamCode: { type: String, unique: true },
    server: { type: String, required: true },
    description: { type: String, default: "" },
    logo: { type: String, default: "" },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["player", "manager", "substitute", "owner"],
          default: "player",
        },
        rank: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", TeamSchema);

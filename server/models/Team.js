const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Generates unique team codes

const TeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    game: { type: String, required: true },
    rank: { type: String, required: true },
    teamCode: { type: String, unique: true, default: uuidv4 }, // Unique team code
    server: { type: String, required: true },
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

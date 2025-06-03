const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const TeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    game: { type: String, required: true },
    rank: { type: String, required: true },
    teamCode: { type: String, unique: true, default: uuidv4 },
    server: { type: String, required: true },
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

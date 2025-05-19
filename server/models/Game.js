const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    ranks: [{ type: String, required: true }],
    formats: [{ type: String, required: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Game", GameSchema);

const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  // ← change this from String to [String]
  servers: {
    type: [String],
    required: true,
    default: [], // ensures you at least get [] if none supplied
  },
  ranks: {
    type: [String],
    required: true,
    default: [],
  },
  formats: {
    type: [String],
    required: true,
    default: [],
  },
});

module.exports = mongoose.model("Game", GameSchema);

const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  servers: {
    type: [String],
    required: true,
    default: [],
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

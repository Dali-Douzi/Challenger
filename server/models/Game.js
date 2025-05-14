const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    ranks: [{ type: String, required: true }] // Predefined list of valid ranks
});

module.exports = mongoose.model('Game', GameSchema);

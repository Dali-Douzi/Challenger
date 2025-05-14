const express = require('express');
const Game = require('../models/Game');

const router = express.Router();

// ✅ Get all games
router.get('/', async (req, res) => {
    try {
        const games = await Game.find();
        res.json(games);
    } catch (error) {
        console.error("Fetch Games Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;

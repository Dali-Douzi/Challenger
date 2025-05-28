const express = require("express");
const Game = require("../models/Game");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const games = await Game.find(
      {},
      { name: 1, servers: 1, ranks: 1, formats: 1 }
    );
    res.json(games);
  } catch (error) {
    console.error("Fetch Games Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

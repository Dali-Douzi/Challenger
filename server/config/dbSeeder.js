const Game = require("../models/Game");

const seedGames = async () => {
  const existingGames = await Game.countDocuments();

  if (existingGames === 0) {
    console.log("🌱 Seeding initial games into database...");

    await Game.insertMany([
      {
        name: "League of Legends",
        ranks: [
          "Iron",
          "Bronze",
          "Silver",
          "Gold",
          "Platinum",
          "Diamond",
          "Master",
          "Grandmaster",
          "Challenger",
        ],
        formats: [
          "1 Game",
          "2 Games",
          "3 Games",
          "4 Games",
          "5 Games",
          "Best of 3",
          "Best of 5",
        ],
      },
      {
        name: "Rocket League",
        ranks: [
          "Bronze",
          "Silver",
          "Gold",
          "Platinum",
          "Diamond",
          "Champion",
          "Grand Champion",
          "Supersonic Legend",
        ],
        formats: ["Best of 7", "Best of 5", "Best of 3", "Bo3 Bo7"],
      },
      {
        name: "Valorant",
        ranks: [
          "Iron",
          "Bronze",
          "Silver",
          "Gold",
          "Platinum",
          "Diamond",
          "Ascendant",
          "Immortal",
          "Radiant",
        ],
        formats: ["1 Game", "2 Games", "3 Games", "Best of 3", "Best of 5"],
      },
      {
        name: "Counter-Strike",
        ranks: [
          "Silver",
          "Gold",
          "Master Guardian",
          "Legendary Eagle",
          "Supreme Master",
          "Global Elite",
        ],
        formats: ["1 Game", "2 Games", "3 Games", "Best of 3", "Best of 5"],
      },
    ]);

    console.log("✅ Game seeding complete!");
  } else {
    console.log("✅ Games already exist in database. Skipping seeding.");
  }
};

module.exports = seedGames;

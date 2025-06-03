const Game = require("../models/Game");

const seedGames = async () => {
  const existingGames = await Game.countDocuments();

  if (existingGames === 0) {
    console.log("🌱 Seeding initial games into database...");

    await Game.insertMany([
      {
        name: "League of Legends",
        servers: ["EUW", "EUNE", "NA", "LAN", "LAS", "OCE", "KR", "JP", "BR"],
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
        servers: [
          "NA-East",
          "NA-West",
          "EU",
          "OCE",
          "South America",
          "Middle East",
        ],
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
        servers: ["NA", "EU", "APAC", "KR", "BR", "LATAM"],
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
        servers: ["NA", "EU", "Asia", "Oceania", "South America"],
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

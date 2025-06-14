const Game = require("../models/Game");

const gamesData = [
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
];

const seedGames = async () => {
  console.log("🌱 Checking and updating games in database...");

  try {
    for (const gameData of gamesData) {
      const result = await Game.findOneAndUpdate(
        { name: gameData.name },
        gameData,
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );
      console.log(`✅ Updated/Created: ${gameData.name}`);
    }

    const totalGames = await Game.countDocuments();
    console.log(`✅ Game seeding complete! Total games: ${totalGames}`);
  } catch (error) {
    console.error("❌ Error during game seeding:", error);
    throw error;
  }
};

module.exports = seedGames;

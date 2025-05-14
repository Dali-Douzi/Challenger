const Game = require('../models/Game');

const seedGames = async () => {
    const existingGames = await Game.countDocuments();
    
    if (existingGames === 0) {
        console.log("🌱 Seeding initial games into database...");

        await Game.insertMany([
            {
                name: "League of Legends",
                ranks: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Challenger"]
            },
            {
                name: "Rocket League",
                ranks: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion", "Supersonic Legend"]
            },
            {
                name: "Valorant",
                ranks: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"]
            },
            {
                name: "Counter-strike",
                ranks: ["Silver", "Gold", "Master Guardian", "Legendary Eagle", "Supreme Master", "Global Elite"]
            }
        ]);

        console.log("✅ Game seeding complete!");
    } else {
        console.log("✅ Games already exist in database. Skipping seeding.");
    }
};

module.exports = seedGames;
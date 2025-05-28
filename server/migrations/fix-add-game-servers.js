// fix-add-game-servers.js
require("dotenv").config();
const mongoose = require("mongoose");
const Game = require("./models/Game"); // adjust path as needed

const gamesData = [
  {
    name: "League of Legends",
    servers: ["EUW", "EUNE", "NA", "LAN", "LAS", "OCE", "KR", "JP", "BR"],
    ranks: [
      "Iron",
      "Bronze",
      "Silver",
      /* … */
      "Supreme Master",
      "Global Elite",
    ],
    formats: ["1 Game", "2 Games", "3 Games", "Best of 3", "Best of 5"],
  },
  {
    name: "Valorant",
    servers: ["NA", "EU", "AP", "KR"],
    ranks: [
      /* … */
    ],
    formats: [
      /* … */
    ],
  },
  /* Rocket League, Counter-Strike, etc. */
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  for (const g of gamesData) {
    await Game.updateOne(
      { name: g.name },
      { $set: { servers: g.servers } },
      { upsert: false } // `upsert:true` if you want to create missing docs
    );
  }

  console.log("✅ Game documents updated with servers.");
  await mongoose.disconnect();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});

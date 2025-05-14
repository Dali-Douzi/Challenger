const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const gameRoutes = require('./routes/gameRoutes');
const seedGames = require('./config/dbSeeder');
const scrimRoutes = require('./routes/scrimRoutes');
const scrimChatRoutes = require('./routes/scrimChatRoutes');
const app = express();

dotenv.config();
app.use(express.json());
app.use(
    cors({
      origin: "http://localhost:5173",
      methods: "GET,POST,PUT,DELETE",
      allowedHeaders: "Content-Type,Authorization",
    })
  );
  
  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "script-src 'self' 'strict-dynamic'");
    next();
  });

/**
 * ✅ Clean MongoDB Connection (No Deprecated Options)
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            connectTimeoutMS: 30000,  
            socketTimeoutMS: 30000
        });

        console.log('✅ MongoDB Connected');
        await seedGames(); // Populate games if missing

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

// Call the connection function
connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/scrims', scrimRoutes);
app.use('/api/scrims/chat', scrimChatRoutes);

const PORT = process.env.PORT || 4444;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const mongoose = require('mongoose');

const ScrimSchema = new mongoose.Schema({
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }, // Team that posted the scrim
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // The confirmed opponent
    format: { 
        type: String, 
        enum: ["1 game", "2 games", "Best of 3", "Best of 5", "Best of 7", "5 games", "7 games"], // ✅ Predefined formats
        required: true 
    },
    scheduledTime: { type: Date, required: true },
    status: { type: String, enum: ['open', 'pending', 'booked'], default: 'open' },
    requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }] // Teams that sent a request
}, { timestamps: true });

module.exports = mongoose.model('Scrim', ScrimSchema);

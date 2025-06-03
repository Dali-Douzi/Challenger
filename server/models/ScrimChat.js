const mongoose = require("mongoose");

const ScrimChatSchema = new mongoose.Schema({
  scrim: { type: mongoose.Schema.Types.ObjectId, ref: "Scrim", required: true },
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("ScrimChat", ScrimChatSchema);

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    scrim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scrim",
      required: true,
    },
    message: { type: String, required: true },
    type: { type: String }, // e.g. "request", "accept", "decline"
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Notification", notificationSchema);

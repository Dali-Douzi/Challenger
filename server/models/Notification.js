const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    scrim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scrim",
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScrimChat",
      required: true,
    },
    url: { type: String },
    message: { type: String, required: true },
    type: { type: String },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);

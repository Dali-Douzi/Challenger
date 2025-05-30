const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    // Always tied to a team
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    // Existing scrim/chat notifications remain supported
    scrim: {
      type: Schema.Types.ObjectId,
      ref: "Scrim",
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "ScrimChat",
    },

    // Tournament alerts
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
    },
    match: {
      type: Schema.Types.ObjectId,
      ref: "Match",
    },

    // Core payload
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "generic",
    },
    data: {
      type: Schema.Types.Mixed,
    },

    // URL the front-end will navigate to
    url: {
      type: String,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias for `url` so that your Navbar can just read `notif.link`
notificationSchema.virtual("link").get(function () {
  return this.url;
});

module.exports = mongoose.model("Notification", notificationSchema);

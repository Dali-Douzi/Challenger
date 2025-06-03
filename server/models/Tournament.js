const mongoose = require("mongoose");
const { Schema } = mongoose;

const phaseSchema = new Schema(
  {
    bracketType: {
      type: String,
      enum: ["SINGLE_ELIM", "DOUBLE_ELIM", "ROUND_ROBIN"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETE"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

const tournamentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    game: {
      type: String,
      required: true,
    },
    maxParticipants: {
      type: Number,
      required: true,
    },
    phases: [phaseSchema],
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refereeCode: {
      type: String,
      required: true,
      unique: true,
    },
    pendingTeams: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    teams: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    referees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: [
        "REGISTRATION_OPEN",
        "REGISTRATION_LOCKED",
        "BRACKET_LOCKED",
        "IN_PROGRESS",
        "COMPLETE",
      ],
      default: "REGISTRATION_OPEN",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tournament", tournamentSchema);

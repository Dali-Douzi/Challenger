const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the schema for each phase of the tournament
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
  { _id: false }
);

const tournamentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    maxParticipants: {
      type: Number,
      required: true,
      min: 2,
    },

    phases: {
      type: [phaseSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one phase is required",
      },
    },

    organizer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    refereeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
    },

    referees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

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

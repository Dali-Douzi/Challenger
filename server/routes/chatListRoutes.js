const express = require("express");
const mongoose = require("mongoose");
const ScrimChat = require("../models/ScrimChat");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @desc   Get all chat threads this user can see
 * @route  GET /api/chats
 * @access Private
 */
router.get("/", protect, async (req, res, next) => {
  try {
    // 1) Find all teams where this user is owner or member
    const teams = await Team.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    }).select("_id");
    const teamIds = teams.map((t) => t._id);

    // 2) Find all scrims where user’s team participates
    //    (i.e. scrim.teamA OR scrim.teamB OR scrim.requests array includes user’s team)
    const scrims = await Scrim.find({
      $or: [
        { teamA: { $in: teamIds } },
        { teamB: { $in: teamIds } },
        { requests: { $in: teamIds } },
      ],
    }).select("_id teamA teamB scheduledTime format");

    const scrimIds = scrims.map((s) => s._id);

    // 3) Now find all ScrimChat docs whose scrim is in one of those scrims
    const chats = await ScrimChat.find({ scrim: { $in: scrimIds } })
      .populate({
        path: "scrim",
        select: "teamA teamB scheduledTime format",
        populate: [
          { path: "teamA", select: "name" },
          { path: "teamB", select: "name" },
        ],
      })
      .lean();

    // Return the list of chat documents (with embedded scrim info)
    return res.json(chats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

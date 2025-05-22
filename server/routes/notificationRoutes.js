const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");
const Team = require("../models/Team");

/**
 * @desc    Get unread notifications for teams the user owns or manages
 * @route   GET /api/notifications
 * @access  Private
 */
router.get("/", protect, async (req, res, next) => {
  try {
    // 1. Find teams where the user is owner or member
    const teams = await Team.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    }).select("_id");
    const teamIds = teams.map((t) => t._id);

    // 2. Fetch only unread notifications for those teams
    const notes = await Notification.find({
      team: { $in: teamIds },
      read: false,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log(
      "🔔 GET /api/notifications →",
      notes.length,
      "unread notifications for teams",
      teamIds
    );
    return res.json(notes);
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
router.put("/:id/read", protect, async (req, res, next) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Only mark if it belongs to one of the user's teams
    const isRelated = await Team.exists({
      _id: notif.team,
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    });
    if (!isRelated) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notif.read = true;
    await notif.save();

    console.log(
      `🔔 PUT /api/notifications/${req.params.id}/read → marked read`
    );
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

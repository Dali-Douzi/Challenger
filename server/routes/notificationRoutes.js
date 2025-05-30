const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");
const Team = require("../models/Team");

/**
 * GET /api/notifications
 * Returns up to 50 unread notifications for teams the user owns or is member of.
 */
router.get("/", protect, async (req, res, next) => {
  try {
    // 1) Teams where the user is owner or member
    const teams = await Team.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    }).select("_id");
    const teamIds = teams.map((t) => t._id);

    // 2) Fetch unread notifications
    let notes = await Notification.find({
      team: { $in: teamIds },
      read: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("team", "name")
      .populate("tournament", "name")
      .populate("match", "slot scheduledAt")
      .populate("scrim", "_id")
      .populate("chat", "_id")
      .lean();

    // 3) Add `link` property so Navbar.jsx can do `notif.link`
    notes = notes.map((n) => {
      n.link = n.url || null;
      return n;
    });

    return res.json(notes);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Marks one notification as read, if it belongs to one of the user's teams.
 */
router.put("/:id/read", protect, async (req, res, next) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Ensure it belongs to one of the user's teams
    const isRelated = await Team.exists({
      _id: notif.team,
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    });
    if (!isRelated) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notif.read = true;
    await notif.save();
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

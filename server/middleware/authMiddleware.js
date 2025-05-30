const jwt = require("jsonwebtoken");
const Tournament = require("../models/Tournament");

// Protect middleware: validates JWT and attaches user to request
const protect = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Checks if the authenticated user is the organizer of the tournament
const isOrganizer = async (req, res, next) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    if (tourney.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Organizer only" });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Checks if the authenticated user is a referee or the organizer
const isRefereeOrOrganizer = async (req, res, next) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    const isOrg = tourney.organizer.toString() === req.user.id;
    const isRef = tourney.referees.some((r) => r.toString() === req.user.id);
    if (!isOrg && !isRef) {
      return res.status(403).json({ message: "Referee or organizer only" });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  protect,
  isOrganizer,
  isRefereeOrOrganizer,
};

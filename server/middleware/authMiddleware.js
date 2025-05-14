const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }

  try {
    // Use environment variable for the JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded user info to the request
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { protect };

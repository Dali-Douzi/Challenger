const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.header("Authorization")) {
      const authHeader = req.header("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (tokenError) {
      if (tokenError.name === "TokenExpiredError") {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
          return res.status(401).json({
            success: false,
            message: "Access token expired and no refresh token provided.",
            code: "TOKEN_EXPIRED",
          });
        }

        try {
          const refreshDecoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
          );

          const newAccessToken = jwt.sign(
            { userId: refreshDecoded.userId },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
          );

          const cookieConfig = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 15 * 60 * 1000,
            domain:
              process.env.NODE_ENV === "production"
                ? process.env.COOKIE_DOMAIN
                : undefined,
          };

          res.cookie("accessToken", newAccessToken, cookieConfig);

          req.user = { userId: refreshDecoded.userId };
          next();
        } catch (refreshError) {
          res.clearCookie("accessToken");
          res.clearCookie("refreshToken");

          return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token. Please login again.",
            code: "REFRESH_TOKEN_INVALID",
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid token.",
        });
      }
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in authentication.",
    });
  }
};

module.exports = authMiddleware;

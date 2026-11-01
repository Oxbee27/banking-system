const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({
      status: "error",
      message: "Authentication required.",
    });
  }

  const parts = authHeader.trim().split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== "bearer" ||
    !parts[1]
  ) {
    return res.status(401).json({
      status: "error",
      message: "Invalid authorization format.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      status: "error",
      message: "Authentication service is not configured.",
    });
  }

  try {
    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (!decoded || !Number.isInteger(Number(decoded.id)) ||
        Number(decoded.id) <= 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid authentication token.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired authentication token.",
    });
  }
};

module.exports = authenticate;

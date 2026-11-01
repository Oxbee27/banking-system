const { findUserById } = require("../database/user");

const authorization = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(403).json({
      status: "error",
      message: "Access denied. Admin privileges are required.",
    });
  }

  try {
    // Never rely solely on the role stored in a potentially stale JWT.
    const currentUser = await findUserById(req.user.id);

    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Admin privileges are required.",
      });
    }

    req.user.role = currentUser.role;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authorization;

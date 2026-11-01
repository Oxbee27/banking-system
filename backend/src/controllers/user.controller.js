const { findUserById } = require("../database/user");

const getProfile = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User details retrieved successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
};

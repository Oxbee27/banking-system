const { users } = require("../database/user");

const getProfile = (req, res) => {
  try {
    const user = users.find((user) => user.id === req.user.id);

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
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

module.exports = {
  getProfile,
};
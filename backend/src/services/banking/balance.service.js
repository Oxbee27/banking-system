const { getUserById } = require("./helpers");

const getBalance = async (userId) => {
  const user = await getUserById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    accountNumber: user.accountNumber,
    balance: user.balance,
  };
};

module.exports = {
  getBalance,
};

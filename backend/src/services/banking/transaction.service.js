const { listTransactionsForUser } = require("../../database/user");

const getTransactions = async (userId) => {
  return listTransactionsForUser(userId);
};

module.exports = {
  getTransactions,
};

const {
  findUserById,
  findUserByAccountNumber,
} = require("../../database/user");
const db = require("../../../models");

const getUserById = async (userId, options) => {
  return findUserById(userId, options);
};

const getUserByAccountNumber = async (accountNumber, options) => {
  return findUserByAccountNumber(accountNumber, options);
};

module.exports = {
  getUserById,
  getUserByAccountNumber,
  withDatabaseTransaction: (callback) => db.sequelize.transaction(callback),
};

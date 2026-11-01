const db = require("../../models");

const userModel = db?.users || db?.User || db?.Users;
const transactionModel =
  db?.transactions || db?.Transaction || db?.Transactions;

const requireModel = (model, operation) => {
  if (!model || typeof model[operation] !== "function") {
    throw new Error(`Database model does not support ${operation}`);
  }
  return model;
};

const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    email: String(user.email || "").toLowerCase(),
    balance: Number(user.balance ?? 0),
    role: user.role || "user",
    pin: user.pin || null,
  };
};

const findUserByEmail = async (email) => {
  const normalizedEmail = String(email || "").toLowerCase();
  const user = await requireModel(userModel, "findOne").findOne({
    where: { email: normalizedEmail },
  });
  return user ? normalizeUser(user.toJSON ? user.toJSON() : user) : null;
};

const findUserById = async (id, options = {}) => {
  const user = await requireModel(userModel, "findByPk").findByPk(id, options);
  return user ? normalizeUser(user.toJSON ? user.toJSON() : user) : null;
};

const findUserByAccountNumber = async (accountNumber, options = {}) => {
  const accountValue = String(accountNumber);
  const user = await requireModel(userModel, "findOne").findOne({
    where: { accountNumber: accountValue },
    ...options,
  });
  return user ? normalizeUser(user.toJSON ? user.toJSON() : user) : null;
};

const createUser = async (payload) => {
  const userData = normalizeUser({
    ...payload,
    email: String(payload.email || "").toLowerCase(),
    balance: Number(payload.balance ?? 0),
  });

  const user = await requireModel(userModel, "create").create(userData);
  return normalizeUser(user.toJSON ? user.toJSON() : user);
};

const updateUser = async (id, updates, options = {}) => {
  const userId = Number(id);

  const [count] = await requireModel(userModel, "update").update(updates, {
    where: { id: userId },
    ...options,
  });
  return count ? findUserById(userId, options) : null;
};

const addTransaction = async (payload, options = {}) => {
  const record = {
    ...payload,
    amount: Number(payload.amount ?? 0),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const transaction = await requireModel(transactionModel, "create").create(
    record,
    options,
  );
  return transaction.toJSON ? transaction.toJSON() : transaction;
};

const listTransactionsForUser = async (userId) => {
  const targetId = Number(userId);

  const rows = await requireModel(transactionModel, "findAll").findAll({
    where: {
      [require("sequelize").Op.or]: [
        { senderId: targetId },
        { receiverId: targetId },
      ],
    },
    order: [["createdAt", "DESC"]],
  });

  return rows.map((transaction) =>
    transaction.toJSON ? transaction.toJSON() : transaction,
  );
};

module.exports = {
  findUserByEmail,
  findUserById,
  findUserByAccountNumber,
  createUser,
  updateUser,
  addTransaction,
  listTransactionsForUser,
};

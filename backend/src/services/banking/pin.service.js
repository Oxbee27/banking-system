const bcrypt = require("bcrypt");
const { updateUser } = require("../../database/user");
const { getUserById, withDatabaseTransaction } = require("./helpers");

const getSaltRounds = () => {
  const rounds = Number(process.env.SALT_ROUNDS) || 10;
  return Number.isInteger(rounds) && rounds >= 10 && rounds <= 15
    ? rounds
    : 10;
};

const createPin = async (userId, pin) =>
  withDatabaseTransaction(async (transaction) => {
    const user = await getUserById(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.pin) {
      const error = new Error("PIN already exists. Use update PIN.");
      error.statusCode = 400;
      throw error;
    }

    const hashedPin = await bcrypt.hash(String(pin), getSaltRounds());

    await updateUser(userId, { pin: hashedPin }, { transaction });
    return true;
  });

const updatePin = async (userId, currentPin, newPin) =>
  withDatabaseTransaction(async (transaction) => {
    const user = await getUserById(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (!user.pin) {
      const error = new Error("You have not created a PIN yet");
      error.statusCode = 400;
      throw error;
    }

    const validPin = await bcrypt.compare(String(currentPin), user.pin);

    if (!validPin) {
      const error = new Error("Current PIN is incorrect");
      error.statusCode = 401;
      throw error;
    }

    const hashedPin = await bcrypt.hash(String(newPin), getSaltRounds());

    await updateUser(userId, { pin: hashedPin }, { transaction });
    return true;
  });

module.exports = {
  createPin,
  updatePin,
};

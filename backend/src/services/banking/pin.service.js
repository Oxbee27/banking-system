const bcrypt = require("bcrypt");
const { updateUser, findUserById } = require("../../database/user");
const { getUserById } = require("./helpers");

const createPin = async (userId, pin) => {
  const user = await getUserById(userId);

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

  const hashedPin = await bcrypt.hash(
    String(pin),
    Number(process.env.SALT_ROUNDS) || 10,
  );
  await updateUser(userId, { pin: hashedPin });

  return true;
};

const updatePin = async (userId, currentPin, newPin) => {
  const user = await findUserById(userId);

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

  const hashedPin = await bcrypt.hash(
    String(newPin),
    Number(process.env.SALT_ROUNDS) || 10,
  );
  await updateUser(userId, { pin: hashedPin });

  return true;
};

module.exports = {
  createPin,
  updatePin,
};

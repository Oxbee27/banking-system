const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { findUserByEmail, createUser } = require("../database/user");
const generateAccountNumber = require("../utils/accountNumber");

const createUserWithUniqueAccountNumber = async (payload) => {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await createUser({
        ...payload,
        accountNumber: generateAccountNumber(),
      });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        const fields = error.fields || {};
        const duplicateEmail =
          Boolean(fields.email) ||
          error.errors?.some((item) => item.path === "email");

        if (duplicateEmail) {
          const conflict = new Error("An account with this email already exists.");
          conflict.statusCode = 409;
          throw conflict;
        }

        const duplicateAccountNumber =
          Boolean(fields.accountNumber) ||
          error.errors?.some((item) => item.path === "accountNumber");

        if (duplicateAccountNumber && attempt < 5) {
          continue;
        }
      }

      throw error;
    }
  }

  const error = new Error("Unable to generate a unique account number.");
  error.statusCode = 503;
  throw error;
};

const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    const error = new Error("User already exists");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.SALT_ROUNDS) || 10,
  );

  return createUserWithUniqueAccountNumber({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    balance: 0,
    role: "user",
    pin: null,
  });
};

const createAdminUser = async ({ name, email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.SALT_ROUNDS) || 10,
  );

  return createUserWithUniqueAccountNumber({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    balance: 0,
    role: "admin",
    pin: null,
  });
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      accountNumber: user.accountNumber,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    },
  );

  return token;
};

module.exports = {
  registerUser,
  loginUser,
  createAdminUser,
};

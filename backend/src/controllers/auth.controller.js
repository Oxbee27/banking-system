const { timingSafeEqual } = require("crypto");

const {
  registerUser,
  loginUser,
  createAdminUser,
} = require("../services/auth.service");

const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    return res.status(201).json({
      status: "success",
      message: "Account created successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        accountNumber: user.accountNumber,
        balance: user.balance,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const token = await loginUser(req.body);

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      token,
    });
  } catch (error) {
    next(error);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const configuredCode = process.env.ADMIN_CREATION_KEY;
    const suppliedCode = req.body.adminCode;

    if (!configuredCode) {
      return res.status(503).json({
        status: "error",
        message: "Admin creation is not configured.",
      });
    }

    const expected = Buffer.from(configuredCode);
    const supplied = Buffer.from(suppliedCode);

    const validCode =
      expected.length === supplied.length &&
      timingSafeEqual(expected, supplied);

    if (!validCode) {
      return res.status(403).json({
        status: "error",
        message: "Invalid admin creation code.",
      });
    }

    const newAdmin = await createAdminUser(req.body);

    return res.status(201).json({
      status: "success",
      message: "Admin account created successfully.",
      data: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        accountNumber: newAdmin.accountNumber,
        balance: newAdmin.balance,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  createAdmin,
};

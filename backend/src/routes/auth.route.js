const express = require("express");

const {
  register,
  login,
  createAdmin,
} = require("../controllers/auth.controller");

const {
  authLimiter,
  adminCreationLimiter,
} = require("../middleware/rateLimiter");

const validate = require("../middleware/validate");

const {
  registerSchema,
  loginSchema,
  adminCreationSchema,
} = require("../validators/auth.validator");

const router = express.Router();

router.post("/register", validate(registerSchema), register);

router.post("/login", authLimiter, validate(loginSchema), login);

router.post(
  "/createAdmin",
  adminCreationLimiter,
  validate(adminCreationSchema),
  createAdmin,
);

module.exports = router;

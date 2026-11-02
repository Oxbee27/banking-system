const rateLimit = require("express-rate-limit");
const PostgresRateLimitStore = require("./postgresRateLimitStore");

const authStore =
  process.env.NODE_ENV === "test"
    ? undefined
    : new PostgresRateLimitStore("auth");
const adminCreationStore =
  process.env.NODE_ENV === "test"
    ? undefined
    : new PostgresRateLimitStore("admin-creation");

const authLimiter = rateLimit({
  ...(authStore ? { store: authStore } : {}),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: "error",
    message: "Too many attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminCreationLimiter = rateLimit({
  ...(adminCreationStore ? { store: adminCreationStore } : {}),
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    status: "error",
    message: "Too many admin creation attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  adminCreationLimiter,
};

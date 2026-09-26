const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,

    message: {
        status: "error",
        message: "Too many attempts. Please try again later."
    },

    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { authLimiter };
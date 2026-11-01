const express = require("express");

const router = express.Router();

const { getProfile } = require("../controllers/user.controller");
const authenticate = require("../middleware/auth");

router.get("/profile", authenticate, getProfile);

module.exports = router;
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");
const authorization = require("../middleware/authorization");

const {
  createPinSchema,
  updatePinSchema,
  transferSchema,
  withdrawSchema,
  adminCreditSchema,
  depositSchema,
} = require("../validators/banking.validator");

const {
  getBalance,
  createPin,
  updatePin,
  transferMoney,
  withdrawMoney,
  getTransactions,
  initializePaystackDeposit,
  verifyPaystackDeposit,
  handlePaystackWebhook,
  adminCreditBalance,
} = require("../controllers/banking.controller");

router.get("/balance", authenticate, getBalance);

router.post("/pin", authenticate, validate(createPinSchema), createPin);

router.patch(
  "/admin/users/:userId/balance",
  authenticate,
  authorization,
  validate(adminCreditSchema),
  adminCreditBalance,
);

router.patch("/pin", authenticate, validate(updatePinSchema), updatePin);

router.post("/transfer", authenticate, validate(transferSchema), transferMoney);
router.post("/deposit/initialize", authenticate, validate(depositSchema), initializePaystackDeposit);
router.get("/deposit/verify", authenticate, verifyPaystackDeposit);
router.post("/paystack/webhook", handlePaystackWebhook);

router.post("/withdraw", authenticate, validate(withdrawSchema), withdrawMoney);

router.get("/transactions", authenticate, getTransactions);

module.exports = router;

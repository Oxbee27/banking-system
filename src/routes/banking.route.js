const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth");
const validate = require("../middleware/validate");
const authorization = require("../middleware/authorization");

const { createPinSchema, updatePinSchema, transferSchema,depositSchema,withdrawSchema } = require("../validators/banking.validator");

const { getBalance,createPin,updatePin,transferMoney,depositMoney,withdrawMoney,getTransactions } = require("../controllers/banking.controller");
 const { adminCreditBalance } = require("../controllers/banking.controller");
//  const router = express.Router();

router.get( "/balance", authenticate,  getBalance );

router.post( "/pin",  authenticate, validate(createPinSchema), createPin
);

 router.patch( "/admin/users/:userId/balance",   authenticate, authorization, adminCreditBalance
);

router.patch( "/pin", authenticate, validate(updatePinSchema), updatePin );

router.post( "/transfer", authenticate, validate(transferSchema), transferMoney );
router.post( "/deposit", authenticate, validate(depositSchema), depositMoney );

router.post("/withdraw", authenticate,validate(withdrawSchema),withdrawMoney)

router.get( "/transactions", authenticate, getTransactions );

module.exports = router;
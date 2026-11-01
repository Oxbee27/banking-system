const {
  findUserById,
  updateUser,
  addTransaction,
} = require("../database/user");
const db = require("../../models");

const adminCreditBalance = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        status: "error",
        message: "Please enter an amount.",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Amount must be greater than zero.",
      });
    }

    const creditAmount = Number(amount);
    const result = await db.sequelize.transaction(async (transaction) => {
      const user = await findUserById(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!user) return null;

      const updatedUser = await updateUser(
        userId,
        { balance: Number(user.balance) + creditAmount },
        { transaction },
      );

      await addTransaction(
        {
          senderId: req.user.id,
          receiverId: user.id,
          senderAccount: null,
          receiverAccount: user.accountNumber,
          amount: creditAmount,
          type: "admin_credit",
          status: "completed",
        },
        { transaction },
      );

      return { user, updatedUser };
    });

    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "User account not found.",
      });
    }

    const { user, updatedUser } = result;

    return res.status(200).json({
      status: "success",
      message: "User balance credited successfully.",
      data: {
        userId: user.id,
        name: user.name,
        amountCredited: creditAmount,
        newBalance: updatedUser.balance,
      },
    });
  } catch (error) {
    next(error);
  }
};

const {
  getBalance: getBalanceService,
  createPin: createPinService,
  updatePin: updatePinService,
  transferMoney: transferMoneyService,
  depositMoney: depositMoneyService,
  withdrawMoney: withdrawMoneyService,
  getTransactions: getTransactionsService,
} = require("../services/banking.service");

const {
  initializePayment,
  verifyPayment,
  handleWebhook,
} = require("../services/paystack.service");

const getBalance = async (req, res, next) => {
  try {
    const balance = await getBalanceService(req.user.id);

    return res.status(200).json({
      status: "success",
      data: balance,
    });
  } catch (error) {
    next(error);
  }
};

const createPin = async (req, res, next) => {
  try {
    await createPinService(req.user.id, req.body.pin);

    return res.status(201).json({
      status: "success",
      message: "Transaction PIN created successfully",
    });
  } catch (error) {
    next(error);
  }
};

const updatePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;

    await updatePinService(req.user.id, currentPin, newPin);

    return res.status(200).json({
      status: "success",
      message: "PIN updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const transferMoney = async (req, res, next) => {
  try {
    const { accountNumber, amount, pin } = req.body;

    const result = await transferMoneyService(
      req.user.id,
      accountNumber,
      amount,
      pin,
    );

    return res.status(200).json({
      status: "success",
      message: "Transfer successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const depositMoney = async (req, res, next) => {
  try {
    const { amount } = req.body;

    const result = await depositMoneyService(req.user.id, amount);

    return res.status(200).json({
      status: "success",
      message: "Deposit successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const withdrawMoney = async (req, res, next) => {
  try {
    const { amount, pin } = req.body;

    const result = await withdrawMoneyService(req.user.id, amount, pin);

    return res.status(200).json({
      status: "success",
      message: "Withdrawal successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const userTransactions = await getTransactionsService(req.user.id);

    return res.status(200).json({
      status: "success",
      data: userTransactions,
    });
  } catch (error) {
    next(error);
  }
};

const initializePaystackDeposit = async (req, res, next) => {
  try {
    const { amount } = req.body;

    const result = await initializePayment({
      userId: req.user.id,
      amount,
    });

    return res.status(200).json({
      status: "success",
      message: "Paystack payment initialized",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const verifyPaystackDeposit = async (req, res, next) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({
        status: "error",
        message: "Payment reference is required.",
      });
    }

    const result = await verifyPayment(reference, req.user.id);

    return res.status(200).json({
      status: "success",
      message: "Deposit verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const handlePaystackWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-paystack-signature"];

    if (!signature) {
      return res.status(401).json({
        status: "error",
        message: "Missing Paystack signature.",
      });
    }

    if (!Buffer.isBuffer(req.rawBody)) {
      return res.status(400).json({
        status: "error",
        message: "Original webhook body is unavailable.",
      });
    }

    const result = await handleWebhook({
      rawBody: req.rawBody,
      signature: String(signature),
    });

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBalance,
  createPin,
  updatePin,
  transferMoney,
  depositMoney,
  withdrawMoney,
  getTransactions,
  adminCreditBalance,
  initializePaystackDeposit,
  verifyPaystackDeposit,
  handlePaystackWebhook,
};

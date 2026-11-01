const crypto = require("crypto");
const { findUserById, updateUser } = require("../database/user");
const {
  createPayment,
  findPaymentByReference,
  updatePayment,
} = require("../database/payment");
const { addTransaction } = require("../database/user");
const db = require("../../models");

const PAYSTACK_BASE_URL =
  process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";

const buildReference = (prefix = "PS") => {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`.toUpperCase();
};

const getPaystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

const paystackRequest = async (path, method = "GET", body = null) => {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method,
    headers: getPaystackHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json();

  if (!response.ok || !payload.status) {
    const error = new Error(payload.message || "Paystack request failed");
    error.statusCode = response.status || 400;
    throw error;
  }

  return payload.data;
};

const initializePayment = async ({ userId, amount }) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    const error = new Error("PAYSTACK_SECRET_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const user = await findUserById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error("Amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }
  const amountKobo = Math.round(numericAmount * 100);
  if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
    const error = new Error("Amount is outside the supported range");
    error.statusCode = 400;
    throw error;
  }

  const reference = buildReference("BANK");
  const payment = await createPayment({
    userId: user.id,
    email: user.email,
    amount: amountKobo,
    currency: "NGN",
    reference,
    status: "pending",
    metadata: {
      userId: user.id,
      accountNumber: user.accountNumber,
    },
  });

  const data = await paystackRequest("/transaction/initialize", "POST", {
    email: user.email,
    amount: amountKobo,
    currency: "NGN",
    reference,
    callback_url:
      process.env.PAYSTACK_CALLBACK_URL ||
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/`,
    metadata: {
      userId: user.id,
      accountNumber: user.accountNumber,
    },
  });

  await updatePayment(payment.id, {
    accessCode: data.access_code,
    authorizationUrl: data.authorization_url,
    gatewayResponse: data,
  });

  return {
    paymentId: payment.id,
    reference,
    amount: amountKobo / 100,
    currency: "NGN",
    accessCode: data.access_code,
    authorizationUrl: data.authorization_url,
    email: user.email,
  };
};

const creditSuccessfulPayment = async (reference, eventData) =>
  db.sequelize.transaction(async (transaction) => {
    const payment = await findPaymentByReference(reference, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!payment) {
      const error = new Error("Payment record not found");
      error.statusCode = 404;
      throw error;
    }

    if (String(payment.status).toLowerCase() === "success") {
      return {
        status: "already_processed",
        paymentId: payment.id,
        reference,
        amount: Number(payment.amount) / 100,
        userId: payment.userId,
      };
    }

    const paidKobo = Number(eventData.amount);
    if (
      !Number.isSafeInteger(paidKobo) ||
      paidKobo <= 0 ||
      paidKobo !== Number(payment.amount) ||
      String(eventData.currency || "").toUpperCase() !== "NGN"
    ) {
      const error = new Error(
        "Paystack amount or currency does not match payment",
      );
      error.statusCode = 400;
      throw error;
    }

    const user = await findUserById(payment.userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) {
      const error = new Error("User for payment not found");
      error.statusCode = 404;
      throw error;
    }

    const paidAmount = paidKobo / 100;
    await updateUser(
      user.id,
      { balance: Number(user.balance) + paidAmount },
      { transaction },
    );
    await addTransaction(
      {
        senderId: null,
        receiverId: user.id,
        senderAccount: null,
        receiverAccount: user.accountNumber,
        amount: paidAmount,
        type: "paystack_deposit",
        status: "successful",
      },
      { transaction },
    );

    const updatedPayment = await updatePayment(
      payment.id,
      {
        status: "success",
        gatewayResponse: eventData,
        paidAt: new Date(),
      },
      { transaction },
    );

    return {
      status: "success",
      paymentId: updatedPayment.id,
      reference,
      amount: paidAmount,
      userId: user.id,
    };
  });

const verifyPayment = async (reference, userId) => {
  if (userId === undefined || userId === null) {
    const error = new Error("Authenticated user is required");
    error.statusCode = 401;
    throw error;
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    const error = new Error("PAYSTACK_SECRET_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const payment = await findPaymentByReference(reference, { userId });
  if (!payment) {
    const error = new Error("Payment record not found for this user");
    error.statusCode = 404;
    throw error;
  }

  const data = await paystackRequest(`/transaction/verify/${reference}`);
  if (data.status !== "success") {
    await updatePayment(payment.id, {
      status: "failed",
      gatewayResponse: data,
    });

    const error = new Error("Payment verification failed");
    error.statusCode = 400;
    throw error;
  }

  return creditSuccessfulPayment(reference, data);
};

const handleWebhook = async ({ rawBody, signature }) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    const error = new Error("PAYSTACK_SECRET_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  if (!Buffer.isBuffer(rawBody)) {
    const error = new Error("Original Paystack webhook body is required");
    error.statusCode = 400;
    throw error;
  }

  const expectedSignature = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest();
  const providedSignature = Buffer.from(String(signature || ""), "hex");

  if (
    providedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, providedSignature)
  ) {
    const error = new Error("Invalid Paystack webhook signature");
    error.statusCode = 401;
    throw error;
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const event = payload.event;
  const eventData = payload.data || {};

  if (event !== "charge.success") {
    return { status: "ignored", event };
  }

  return creditSuccessfulPayment(eventData.reference, eventData);
};

module.exports = {
  initializePayment,
  verifyPayment,
  handleWebhook,
};

const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../models");
const {
  initializePayment,
  verifyPayment,
} = require("../src/services/paystack.service");

test("payment initialization uses the registered email and secure reference", async () => {
  const previousSecret = process.env.PAYSTACK_SECRET_KEY;
  const originalFindByPk = db.users.findByPk;
  const originalPaymentFindByPk = db.payments.findByPk;
  const originalCreate = db.payments.create;
  const originalUpdate = db.payments.update;
  const originalFetch = global.fetch;
  process.env.PAYSTACK_SECRET_KEY = "paystack-test-secret";

  let storedPayment;
  let gatewayRequest;

  db.users.findByPk = async () => ({
    id: 52,
    email: "registered@example.com",
    accountNumber: "1000000052",
    balance: 0,
  });
  db.payments.create = async (record) => {
    storedPayment = record;
    return { id: 7, ...record };
  };
  db.payments.findByPk = async (id) => ({ id, ...storedPayment });
  db.payments.update = async () => [1];
  global.fetch = async (url, options) => {
    gatewayRequest = { url, options };
    return {
      ok: true,
      json: async () => ({
        status: true,
        data: {
          access_code: "access-code",
          authorization_url: "https://paystack.test/authorize",
        },
      }),
    };
  };

  try {
    const result = await initializePayment({
      userId: 52,
      amount: 125.5,
      email: "attacker-supplied@example.com",
    });
    const gatewayBody = JSON.parse(gatewayRequest.options.body);

    assert.equal(storedPayment.email, "registered@example.com");
    assert.equal(gatewayBody.email, "registered@example.com");
    assert.equal(storedPayment.amount, 12550);
    assert.match(result.reference, /^BANK_[A-F0-9]{32}$/);
    assert.equal(result.email, "registered@example.com");
  } finally {
    db.users.findByPk = originalFindByPk;
    db.payments.findByPk = originalPaymentFindByPk;
    db.payments.create = originalCreate;
    db.payments.update = originalUpdate;
    global.fetch = originalFetch;
    if (previousSecret === undefined) {
      delete process.env.PAYSTACK_SECRET_KEY;
    } else {
      process.env.PAYSTACK_SECRET_KEY = previousSecret;
    }
  }
});

test("payment helper preserves owner, transaction, and row-lock options", async () => {
  const originalFindOne = db.payments.findOne;
  const { findPaymentByReference } = require("../src/database/payment");
  const transaction = { id: "transaction" };
  const lock = { UPDATE: "UPDATE" };
  let receivedOptions;

  db.payments.findOne = async (options) => {
    receivedOptions = options;
    return { id: 4, userId: 91, reference: "BANK_REFERENCE", amount: 12550 };
  };

  try {
    const payment = await findPaymentByReference("BANK_REFERENCE", {
      userId: 91,
      transaction,
      lock: lock.UPDATE,
    });

    assert.equal(payment.userId, 91);
    assert.deepEqual(receivedOptions, {
      where: { reference: "BANK_REFERENCE", userId: 91 },
      transaction,
      lock: lock.UPDATE,
    });
  } finally {
    db.payments.findOne = originalFindOne;
  }
});

test("user helper passes transaction and row-lock options to Sequelize", async () => {
  const originalFindByPk = db.users.findByPk;
  const { findUserById } = require("../src/database/user");
  const transaction = { id: "transaction" };
  const lock = "UPDATE";
  let receivedOptions;

  db.users.findByPk = async (id, options) => {
    receivedOptions = { id, options };
    return { id, email: "owner@example.com", balance: "100.00" };
  };

  try {
    const user = await findUserById(91, { transaction, lock });

    assert.equal(user.id, 91);
    assert.deepEqual(receivedOptions, {
      id: 91,
      options: { transaction, lock },
    });
  } finally {
    db.users.findByPk = originalFindByPk;
  }
});

test("payment verification scopes lookup to the authenticated owner", async () => {
  const previousSecret = process.env.PAYSTACK_SECRET_KEY;
  const originalFindOne = db.payments.findOne;
  const originalFetch = global.fetch;
  process.env.PAYSTACK_SECRET_KEY = "paystack-test-secret";

  let lookupOptions;
  let gatewayCalled = false;
  db.payments.findOne = async (options) => {
    lookupOptions = options;
    return null;
  };
  global.fetch = async () => {
    gatewayCalled = true;
    throw new Error("Gateway should not be called for a non-owner");
  };

  try {
    await assert.rejects(verifyPayment("BANK_PRIVATE_REFERENCE", 91), {
      message: "Payment record not found for this user",
      statusCode: 404,
    });
    assert.deepEqual(lookupOptions.where, {
      reference: "BANK_PRIVATE_REFERENCE",
      userId: 91,
    });
    assert.equal(gatewayCalled, false);
  } finally {
    db.payments.findOne = originalFindOne;
    global.fetch = originalFetch;
    if (previousSecret === undefined) {
      delete process.env.PAYSTACK_SECRET_KEY;
    } else {
      process.env.PAYSTACK_SECRET_KEY = previousSecret;
    }
  }
});

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const app = require("../src/app");
const db = require("../models");

const makeRequest = async (method, path, body, headers = {}) => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return res;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const makeRawRequest = async (method, path, body, headers = {}) => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body,
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test("GET / responds with success payload", async () => {
  const res = await makeRequest("GET", "/");

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.status, "success");
  assert.equal(payload.message, "Banking API is running");
});

test("auth routes are mounted without connecting to a database", async () => {
  const originalFindOne = db.users.findOne;

  // The purpose of this test is to verify route registration, not database access.
  db.users.findOne = async () => null;

  try {
    const res = await makeRequest("POST", "/auth/login", {
      email: "user@example.com",
      password: "secret",
    });

    assert.equal(res.status, 401);
  } finally {
    db.users.findOne = originalFindOne;
  }
});

test("POST /auth/forgot-password resets a user's password", async () => {
  const originalFindOne = db.users.findOne;
  const originalUpdate = db.users.update;

  db.users.findOne = async ({ where }) =>
    where.email === "user@example.com"
      ? { id: 42, email: "user@example.com" }
      : null;
  db.users.update = async (changes, options) => {
    assert.equal(options.where.id, 42);
    assert.ok(typeof changes.password === "string");
    return [1];
  };

  try {
    const res = await makeRequest("POST", "/auth/forgot-password", {
      email: "user@example.com",
      newPassword: "NewPass123!",
      confirmPassword: "NewPass123!",
    });

    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.status, "success");
    assert.match(payload.message, /password.*reset/i);
  } finally {
    db.users.findOne = originalFindOne;
    db.users.update = originalUpdate;
  }
});

test("Paystack webhook verifies the original raw request bytes", async () => {
  const previousSecret = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "webhook-test-secret";

  try {
    const rawBody = '{\n  "event": "transfer.success",\n  "data": {}\n}';
    const signature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");
    const accepted = await makeRawRequest(
      "POST",
      "/banking/paystack/webhook",
      rawBody,
      { "x-paystack-signature": signature },
    );

    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).data.status, "ignored");

    const rejected = await makeRawRequest(
      "POST",
      "/banking/paystack/webhook",
      rawBody,
      { "x-paystack-signature": "invalid" },
    );
    assert.equal(rejected.status, 401);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.PAYSTACK_SECRET_KEY;
    } else {
      process.env.PAYSTACK_SECRET_KEY = previousSecret;
    }
  }
});

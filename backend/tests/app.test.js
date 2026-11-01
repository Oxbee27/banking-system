const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const app = require("../src/app");

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

test("auth routes are mounted", async () => {
  const res = await makeRequest("POST", "/auth/login", {
    email: "user@example.com",
    password: "secret",
  });

  assert.notEqual(res.status, 404);
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

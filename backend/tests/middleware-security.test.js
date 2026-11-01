const test = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const errorHandler = require("../src/middleware/errorHandler");
const logger = require("../src/middleware/logger");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  headersSent: false,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("Express trusts exactly one reverse proxy hop", () => {
  assert.equal(app.get("trust proxy"), 1);
});

test("error handler preserves safe client error messages", () => {
  const res = createResponse();

  errorHandler(
    Object.assign(new Error("Insufficient balance"), { statusCode: 400 }),
    {},
    res,
    () => {}
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Insufficient balance");
});

test("error handler hides internal server error details", () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  const res = createResponse();

  try {
    errorHandler(
      new Error("Sensitive database connection details"),
      {},
      res,
      () => {}
    );

    assert.equal(res.statusCode, 500);
    assert.equal(
      res.body.message,
      "Something went wrong. Please try again later."
    );
    assert.doesNotMatch(
      JSON.stringify(res.body),
      /database connection details/i
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("error handler responds with 413 for oversized request bodies", () => {
  const res = createResponse();

  errorHandler(
    Object.assign(new Error("Too large"), { type: "entity.too.large" }),
    {},
    res,
    () => {}
  );

  assert.equal(res.statusCode, 413);
});

test("request logger does not log query string values", () => {
  const originalConsoleLog = console.log;
  let logged = "";

  console.log = (message) => {
    logged = message;
  };

  try {
    logger(
      {
        method: "GET",
        path: "/banking/deposit/verify",
        originalUrl: "/banking/deposit/verify?reference=private-reference",
      },
      {},
      () => {}
    );

    assert.equal(logged, "GET /banking/deposit/verify");
    assert.doesNotMatch(logged, /private-reference/);
  } finally {
    console.log = originalConsoleLog;
  }
});

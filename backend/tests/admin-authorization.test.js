const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../models");
const authorization = require("../src/middleware/authorization");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("admin authorization rejects a token whose user is no longer an admin", async () => {
  const originalFindByPk = db.users.findByPk;
  let nextCalled = false;

  db.users.findByPk = async () => ({
    id: 7,
    role: "user",
    balance: "0.00",
  });

  const req = { user: { id: 7, role: "admin" } };
  const res = createResponse();

  try {
    await authorization(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(
      res.body.message,
      "Access denied. Admin privileges are required."
    );
  } finally {
    db.users.findByPk = originalFindByPk;
  }
});

test("admin authorization allows a user whose current database role is admin", async () => {
  const originalFindByPk = db.users.findByPk;
  let nextCalled = false;

  db.users.findByPk = async () => ({
    id: 8,
    role: "admin",
    balance: "0.00",
  });

  const req = { user: { id: 8, role: "user" } };
  const res = createResponse();

  try {
    await authorization(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.role, "admin");
    assert.equal(res.statusCode, 200);
  } finally {
    db.users.findByPk = originalFindByPk;
  }
});

test("admin authorization rejects a deleted user", async () => {
  const originalFindByPk = db.users.findByPk;
  db.users.findByPk = async () => null;

  const req = { user: { id: 9, role: "admin" } };
  const res = createResponse();

  try {
    await authorization(req, res, () => {
      assert.fail("next should not be called for a deleted user");
    });

    assert.equal(res.statusCode, 403);
  } finally {
    db.users.findByPk = originalFindByPk;
  }
});

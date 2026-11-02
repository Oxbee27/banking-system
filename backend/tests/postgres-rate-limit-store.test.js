const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../models");
const PostgresRateLimitStore = require("../src/middleware/postgresRateLimitStore");

test("rate limit counters are namespaced and incremented atomically in PostgreSQL", async () => {
  const originalQuery = db.sequelize.query;
  const resetAt = new Date("2026-11-01T12:15:00.000Z");
  let capturedQuery;
  let capturedOptions;

  db.sequelize.query = async (query, options) => {
    capturedQuery = query;
    capturedOptions = options;
    return [{ totalHits: "4", resetAt }];
  };

  try {
    const store = new PostgresRateLimitStore("auth");
    store.init({ windowMs: 15 * 60 * 1000 });

    const result = await store.increment("127.0.0.1");

    assert.equal(result.totalHits, 4);
    assert.equal(result.resetTime.toISOString(), resetAt.toISOString());
    assert.equal(capturedOptions.replacements.id, "auth:127.0.0.1");
    assert.equal(
      capturedOptions.replacements.nextResetAt.getTime() - Date.now() <=
        15 * 60 * 1000,
      true,
    );
    assert.match(capturedQuery, /ON CONFLICT \("id"\) DO UPDATE/);
    assert.match(capturedQuery, /"totalHits" \+ 1/);
  } finally {
    db.sequelize.query = originalQuery;
  }
});

test("separate limiter namespaces use separate persistent counters", async () => {
  const authStore = new PostgresRateLimitStore("auth");
  const adminStore = new PostgresRateLimitStore("admin-creation");

  assert.notEqual(
    authStore.keyFor("127.0.0.1"),
    adminStore.keyFor("127.0.0.1"),
  );
});

const db = require("../../models");

const incrementSql = `
  WITH stale AS (
    SELECT "id"
    FROM "rate_limits"
    WHERE "resetAt" < NOW() - INTERVAL '1 day'
    ORDER BY "resetAt" ASC
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  ), cleanup AS (
    DELETE FROM "rate_limits" AS rate_limit
    USING stale
    WHERE rate_limit."id" = stale."id"
  )
  INSERT INTO "rate_limits" ("id", "totalHits", "resetAt", "createdAt", "updatedAt")
  VALUES (:id, 1, :nextResetAt, NOW(), NOW())
  ON CONFLICT ("id") DO UPDATE SET
    "totalHits" = CASE
      WHEN "rate_limits"."resetAt" <= NOW() THEN 1
      ELSE "rate_limits"."totalHits" + 1
    END,
    "resetAt" = CASE
      WHEN "rate_limits"."resetAt" <= NOW() THEN EXCLUDED."resetAt"
      ELSE "rate_limits"."resetAt"
    END,
    "updatedAt" = NOW()
  RETURNING "totalHits", "resetAt"
`;

class PostgresRateLimitStore {
  constructor(namespace) {
    this.namespace = namespace;
    this.windowMs = 15 * 60 * 1000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  keyFor(key) {
    return `${this.namespace}:${key}`;
  }

  async increment(key) {
    const rows = await db.sequelize.query(incrementSql, {
      replacements: {
        id: this.keyFor(key),
        nextResetAt: new Date(Date.now() + this.windowMs),
      },
      type: db.Sequelize.QueryTypes.SELECT,
    });
    const row = rows[0];

    return {
      totalHits: Number(row.totalHits),
      resetTime: new Date(row.resetAt),
    };
  }

  async get(key) {
    const rows = await db.sequelize.query(
      'SELECT "totalHits", "resetAt" FROM "rate_limits" WHERE "id" = :id',
      {
        replacements: { id: this.keyFor(key) },
        type: db.Sequelize.QueryTypes.SELECT,
      },
    );
    const row = rows[0];

    if (!row) return undefined;

    return {
      totalHits: Number(row.totalHits),
      resetTime: new Date(row.resetAt),
    };
  }

  async decrement(key) {
    await db.sequelize.query(
      'UPDATE "rate_limits" SET "totalHits" = GREATEST("totalHits" - 1, 0), "updatedAt" = NOW() WHERE "id" = :id',
      { replacements: { id: this.keyFor(key) } },
    );
  }

  async resetKey(key) {
    await db.sequelize.query('DELETE FROM "rate_limits" WHERE "id" = :id', {
      replacements: { id: this.keyFor(key) },
    });
  }

  async resetAll() {
    await db.sequelize.query('DELETE FROM "rate_limits"');
  }

  shutdown() {}
}

module.exports = PostgresRateLimitStore;

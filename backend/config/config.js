"use strict";

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const databaseUrlEnvName = process.env.DATABASE_URL
  ? "DATABASE_URL"
  : process.env.DB_URL
    ? "DB_URL"
    : process.env.POSTGRES_URL
      ? "POSTGRES_URL"
      : process.env.AIVEN_DATABASE_URL
        ? "AIVEN_DATABASE_URL"
        : null;

const databaseUrl = databaseUrlEnvName ? process.env[databaseUrlEnvName] : null;

const sslEnabled =
  process.env.DB_SSL === "true" ||
  Boolean(databaseUrl && databaseUrl.includes("sslmode=require"));

let dialectOptions;

if (sslEnabled) {
  const caPath = process.env.DB_SSL_CA_PATH;
  if (!caPath) {
    throw new Error("DB_SSL_CA_PATH is required when DB_SSL=true");
  }

  const resolvedCaPath = path.resolve(__dirname, "..", caPath);

  if (!fs.existsSync(resolvedCaPath)) {
    throw new Error(`SSL CA file not found at ${resolvedCaPath}`);
  }

  dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: true,
      ca: fs.readFileSync(resolvedCaPath, "utf8"),
    },
  };
}

const shared = {
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || null,
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  dialect: process.env.DB_DIALECT || "postgres",
  ...(dialectOptions && { dialectOptions }),
};

const productionConfig = {
  ...shared,
  database: process.env.DB_NAME_PRODUCTION || "database_production",
};

if (databaseUrlEnvName) {
  productionConfig.use_env_variable = databaseUrlEnvName;
}

module.exports = {
  development: {
    ...shared,
    ...(databaseUrlEnvName ? { use_env_variable: databaseUrlEnvName } : {}),
    database: process.env.DB_NAME || "database_development",
  },
  test: {
    ...shared,
    // Tests must never inherit the remote development/production DATABASE_URL.
    database: process.env.DB_NAME_TEST || "banking_system_test",
  },
  production: productionConfig,
};

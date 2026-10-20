"use strict";

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const sslEnabled = process.env.DB_SSL === "true";
let dialectOptions;

if (sslEnabled) {
  const caPath = process.env.DB_SSL_CA_PATH;
  if (!caPath) {
    throw new Error("DB_SSL_CA_PATH is required when DB_SSL=true");
  }

  const resolvedCaPath = path.resolve(process.cwd(), caPath);
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

module.exports = {
  development: {
    ...shared,
    database: process.env.DB_NAME || "database_development",
  },
  test: {
    ...shared,
    database: process.env.DB_NAME_TEST || "database_test",
  },
  production: {
    ...shared,
    database: process.env.DB_NAME_PRODUCTION || "database_production",
  },
};

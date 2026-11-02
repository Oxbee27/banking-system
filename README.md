 FineBank

A banking API and browser-based account dashboard built with Express, Sequelize, PostgreSQL, and a dependency-free frontend. The backend API is available at `/`; the frontend is served at `/app` by the same Express server.

> **Important implementation note:** User accounts, balances, PIN hashes, transactions, Paystack payments, and authentication rate-limit counters are stored in PostgreSQL. Run all migrations before serving traffic. This remains a development/demo foundation, not a production banking system; do not use it for real funds or sensitive customer data until security, auditability, funding, and operational controls are independently reviewed.

Contents

1. [Backend](#backend)
2. [Frontend](#frontend)
3. [Known limitations and production checklist](#known-limitations-and-production-checklist)

---

# Backend

## Stack

- Node.js and Express 5
- PostgreSQL with Sequelize 6 and Sequelize CLI
- JWT bearer authentication
- bcrypt password and transaction-PIN hashing
- Zod request validation
- dotenv environment configuration

## Requirements

- Node.js 18 or later (a current LTS release is recommended)
- npm
- PostgreSQL 14 or later, or an Aiven PostgreSQL service
- Aiven CA certificate when SSL certificate verification is required

## Install and configure

```bash
npm install
cp .env.example .env
```

Edit `.env` with local credentials. Never commit `.env`; it is ignored by Git. A typical local PostgreSQL configuration is:

```dotenv
PORT=3000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-secret
SALT_ROUNDS=10
ADMIN_CREATION_KEY=replace-with-a-separate-random-secret

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-local-password
DB_NAME=banking_development
DB_NAME_TEST=banking_test
DB_NAME_PRODUCTION=banking_production
DB_DIALECT=postgres
DB_SSL=false
DB_SSL_CA_PATH=
```

The Sequelize configuration is JavaScript in `config/config.js`. It loads `.env` and consumes these variables:

| Variable             | Purpose                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `PORT`               | HTTP port; defaults to `3000`                                                              |
| `NODE_ENV`           | Selects the Sequelize environment (`development`, `test`, or `production`)                 |
| `JWT_SECRET`         | Secret used to sign and verify bearer tokens; set a strong private value                   |
| `SALT_ROUNDS`        | bcrypt work factor; defaults to `10`                                                       |
| `ADMIN_CREATION_KEY` | Secret required by the public admin creation endpoint                                      |
| `DB_HOST`            | PostgreSQL hostname                                                                        |
| `DB_PORT`            | PostgreSQL port; defaults to `5432`                                                        |
| `DB_USERNAME`        | PostgreSQL username                                                                        |
| `DB_PASSWORD`        | PostgreSQL password                                                                        |
| `DB_NAME`            | Development database name                                                                  |
| `DB_NAME_TEST`       | Test database name                                                                         |
| `DB_NAME_PRODUCTION` | Production database name                                                                   |
| `DB_DIALECT`         | Sequelize dialect; use `postgres`                                                          |
| `DB_SSL`             | Set to `true` to enable TLS with CA verification                                           |
| `DB_SSL_CA_PATH`     | CA certificate path, relative to the project root or absolute; required when `DB_SSL=true` |

### Aiven TLS

Download the CA certificate from the Aiven service's connection information and store it in a private, non-public project location. For example, with `certs/ca.pem`:

```dotenv
DB_HOST=your-service.aivencloud.com
DB_PORT=your-aiven-port
DB_USERNAME=avnadmin
DB_PASSWORD=your-aiven-password
DB_NAME=defaultdb
DB_DIALECT=postgres
DB_SSL=true
DB_SSL_CA_PATH=certs/ca.pem
```

The config reads the CA file and enables `rejectUnauthorized`; the server certificate is verified. Keep the certificate file and `.env` out of version control if your deployment policy requires that. For hosted environments, configure environment variables through the host's secret manager and provide the CA file using its supported secret-file mechanism.

## Run

```bash
npm run dev
```

Or start without file watching:

```bash
npm start
```

The API health check is `GET http://localhost:3000/`. The frontend is `http://localhost:3000/app`.

## Database migrations

Run migrations against the selected `NODE_ENV` config before starting the API:

```bash
npx sequelize-cli db:migrate
```

To undo the most recent migration:

```bash
npx sequelize-cli db:migrate:undo
```

The CLI reads `.sequelizerc`, which points to the JavaScript configuration at `config/config.js`. Confirm the selected DB values and SSL CA path before running commands against a hosted database.

## API conventions

- JSON request and response bodies.
- Authentication uses `Authorization: Bearer <token>`.
- Success responses generally contain `status: "success"`, plus `message`, `data`, or `token` as appropriate.
- Errors use `status: "error"` and a `message`; validation errors may also contain an `errors` array with `field` and `message`.
- Amounts must be positive JSON numbers, not numeric strings.
- Transaction PINs are four digits.
- The current login token expires after one hour.

### Routes

| Method  | Path                                   | Auth         | Request                                        | Purpose                                                                         |
| ------- | -------------------------------------- | ------------ | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET`   | `/`                                    | No           | None                                           | API health check                                                                |
| `POST`  | `/auth/register`                       | No           | `{ "name", "email", "password" }`              | Create a customer account; password must be at least 6 characters               |
| `POST`  | `/auth/login`                          | No           | `{ "email", "password" }`                      | Sign in; returns `{ "token" }`. Limited to 5 attempts per 15 minutes per client |
| `POST`  | `/auth/createAdmin`                    | No           | `{ "name", "email", "password", "adminCode" }` | Create admin account using `ADMIN_CREATION_KEY`                                 |
| `GET`   | `/user/profile`                        | Bearer       | None                                           | Return the signed-in user's profile                                             |
| `GET`   | `/banking/balance`                     | Bearer       | None                                           | Return account number and balance                                               |
| `GET`   | `/banking/transactions`                | Bearer       | None                                           | Return the signed-in user's transactions                                        |
| `POST`  | `/banking/pin`                         | Bearer       | `{ "pin" }`                                    | Create a four-digit transaction PIN                                             |
| `PATCH` | `/banking/pin`                         | Bearer       | `{ "currentPin", "newPin" }`                   | Update the transaction PIN                                                      |
| `POST`  | `/banking/transfer`                    | Bearer       | `{ "accountNumber", "amount", "pin" }`         | Transfer funds to another account number                                        |
| `POST`  | `/banking/deposit`                     | Bearer       | `{ "amount" }`                                 | Deposit funds into the signed-in account                                        |
| `POST`  | `/banking/withdraw`                    | Bearer       | `{ "amount", "pin" }`                          | Withdraw funds from the signed-in account                                       |
| `PATCH` | `/banking/admin/users/:userId/balance` | Admin bearer | `{ "amount" }`                                 | Credit a user's balance                                                         |

### Example requests

Register:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Taylor Example","email":"taylor@example.com","password":"example-password"}'
```

Sign in and use the returned token on protected routes:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"taylor@example.com","password":"example-password"}'

curl http://localhost:3000/banking/balance \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Backend scripts

| Command                        | Description                          |
| ------------------------------ | ------------------------------------ |
| `npm start`                    | Start the Express server             |
| `npm run dev`                  | Start with nodemon                   |
| `npm test`                     | Run the automated Node.js test suite |
| `npx sequelize-cli db:migrate` | Apply database migrations            |

---

# Frontend

## Overview

The Northstar account dashboard is a responsive, dependency-free browser app in `public/`. Express serves it at `/app`; its API calls use same-origin paths by default. The design includes a customer authentication screen, account overview, activity table, transfer/deposit/withdraw workflows, PIN settings, and an admin credit screen.

## Features and route coverage

- Customer registration and sign in: `POST /auth/register`, `POST /auth/login`
- Admin account creation from the sign-in screen: `POST /auth/createAdmin`
- Profile, balance, and activity loading: `GET /user/profile`, `GET /banking/balance`, `GET /banking/transactions`
- Transaction PIN create/update: `POST /banking/pin`, `PATCH /banking/pin`
- Transfer, deposit, and withdrawal: `POST /banking/transfer`, `POST /banking/deposit`, `POST /banking/withdraw`
- Admin account crediting: `PATCH /banking/admin/users/:userId/balance`
- Sign-out clears the browser session token. A `401` response also clears an expired token.

The health check `GET /` remains a backend JSON endpoint; use `/app` to open the frontend.

## Use the frontend

1. Configure and start the backend using the instructions above.
2. Open `http://localhost:3000/app`.
3. Create an account, then sign in.
4. Create a transaction PIN in Account settings before making transfers or withdrawals.
5. An admin account can be created from the sign-in screen using the backend's `ADMIN_CREATION_KEY`; admin crediting requires a target user ID.

## Frontend configuration

By default, `public/app.js` calls the API on the same origin, so no CORS or separate frontend server is needed. To point the browser app at a different API origin, define `window.BANKING_API_BASE` before `app.js` loads. For local development, serving the UI through Express is the recommended path.

## Browser support and accessibility

The UI uses responsive layouts for narrow screens, semantic form labels and buttons, keyboard-operable dialogs, visible focus styles, status announcements, and reduced-motion preferences. It loads DM Sans and Manrope from Google Fonts with local sans-serif fallbacks.

---

# Known limitations and production checklist

The API persists user and banking records in PostgreSQL, but important backend work is still needed before the app represents a production banking product:

- Apply all Sequelize migrations before starting the API. Authentication rate-limit counters also live in PostgreSQL so they are shared across server processes.
- Use a real, auditable funding source for all deposits. The direct deposit endpoint credits the stored balance without external payment settlement; use the Paystack flow for verified funding.
- Add transaction authorization controls, idempotency, concurrency-safe balance updates, immutable audit records, limits, fraud controls, and reconciliation.
- Protect admin account provisioning. The current endpoint is public and relies solely on a shared creation key; use a controlled provisioning flow and stronger authorization.
- Add CSRF strategy if browser authentication moves from local storage to cookies, secure headers, and token refresh/revocation policy.
- Add automated integration, migration, and browser tests.
- Add monitoring, backups, incident response, secrets rotation, data retention, privacy review, and legal/regulatory review before handling real financial activity.

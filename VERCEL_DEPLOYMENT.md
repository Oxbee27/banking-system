# Deploy FineBank to Vercel

FineBank is split into two Vercel projects because the frontend is a Vite app and the API is an Express app:

- Frontend project root: `frontend`
- API project root: `backend`

Connect the repository to Vercel twice, selecting the matching Root Directory for each project. The frontend configuration is in `frontend/vercel.json`. Vercel can deploy the Express app exported from `backend/src/app.js` as a Function.

## Deploy the API

Create the API project first and set its Root Directory to `backend`. Add these Production Environment Variables in the Vercel project settings:

| Variable                | Value                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`              | `production`                                                            |
| `JWT_SECRET`            | A long, randomly generated secret                                       |
| `ADMIN_CREATION_KEY`    | A separate, randomly generated secret                                   |
| `FRONTEND_URL`          | The deployed frontend origin, such as `https://finebank-web.vercel.app` |
| `PAYSTACK_SECRET_KEY`   | Required only when using Paystack; keep it private                      |
| `PAYSTACK_CALLBACK_URL` | Optional; otherwise the app uses `FRONTEND_URL`                         |

Deploy once to get the API's Vercel URL. After deploying the frontend, set `FRONTEND_URL` to its exact origin and redeploy the API so browser requests pass the API's CORS allowlist.

The API reads database settings such as `DATABASE_URL` (or `DB_URL` / `POSTGRES_URL`) for Sequelize configuration. When `DB_SSL=true`, it also requires `DB_SSL_CA_PATH` to point to a CA certificate available in the backend deployment. Add the certificate to the backend project files according to your database provider's guidance; do not put database passwords in source control. Apply all Sequelize migrations before directing traffic to the API:

```bash
cd backend
NODE_ENV=production npx sequelize-cli db:migrate
```

## Deploy the frontend

Create a second Vercel project from the same repository and set its Root Directory to `frontend`. Add this Production Environment Variable before building:

| Variable            | Value                                                                |
| ------------------- | -------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | The API deployment origin, such as `https://finebank-api.vercel.app` |

Vite embeds `VITE_API_BASE_URL` at build time. Redeploy the frontend whenever that value changes. The frontend's Vercel configuration builds with `npm ci` and `npm run build`, serves `dist`, and routes app paths back to `index.html`.

## Persistence and production readiness

User accounts, balances, PIN hashes, transaction records, PayStack payments, and authentication rate-limit counters are stored in PostgreSQL; do not deploy without applying the migrations. The browser keeps the login token in `localStorage`. The direct deposit endpoint still credits account balances without external settlement, so use verified Paystack payments for funding. This remains a demo foundation and must not handle real funds or sensitive customer data until security, auditability, and operational controls are independently reviewed.

# Banking System Backend

## Paystack integration

This backend supports a Paystack-backed deposit flow.

### Required environment variables

```bash
PAYSTACK_SECRET_KEY=your_secret_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CALLBACK_URL=http://localhost:3000/banking/deposit/verify
```

### Payment flow

1. Client calls `POST /banking/deposit/initialize` with an authenticated user token and an amount.
2. The backend creates a pending payment record and initializes the transaction with Paystack.
3. The frontend opens the returned `authorizationUrl` in a browser.
4. After successful payment, the app verifies the payment reference at `GET /banking/deposit/verify?reference=...`.
5. The backend credits the user's balance and records the transaction.
6. The Paystack webhook at `POST /banking/paystack/webhook` is the source of truth for final confirmation.

### Notes

- Paystack amounts must be sent in kobo (smallest currency value) to the Paystack API.
- The backend verifies the webhook signature using `x-paystack-signature`.
- Each payment reference should be unique and idempotent-safe.

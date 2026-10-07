# Admin Payment Management

## Scope

This feature keeps a manual accounting record of money received from SaaS shops. It deliberately does not integrate a payment gateway.

## Payment ledger

Every received payment creates a new append-only `payment_records` row. The record keeps:

- shop
- amount and INR currency
- method: Cash, UPI, Bank Transfer or Other
- optional reference / transaction / receipt number
- payment received date
- admin comment / note
- plan-name snapshot
- administrator who recorded the payment
- extension days
- subscription expiry before and after the payment

There is no edit or delete API for payment rows in Phase 1. This prevents later subscription changes from rewriting historical revenue.

## Subscription behavior

Recording a payment sets the shop subscription `paymentStatus` to `PAID`.

When `activateSubscription=true`, the stored subscription status becomes `ACTIVE`. An expired/cancelled subscription requires positive renewal days before it can be activated.

When renewal days are supplied, the extension starts from the later of the current subscription expiry or the current time. This preserves remaining service time for early renewals.

Direct subscription PATCH requests cannot set `paymentStatus=PAID`; an actual ledger entry is required.

## Admin UI

`/admin/payments` provides received-revenue summary, payment count, Cash/UPI totals, a new-payment form, shop/method filters, and full payment history with comments, references and renewal effects.

Eligible payment shops are APPROVED, ACTIVE or SUSPENDED shops with an existing subscription.

## API

- `GET /api/admin/payments`
- `POST /api/admin/payments`

Both require platform ADMIN access.

## Regression test

With the application running against an isolated local/test database:

```bash
npm run db:migrate:deploy
npm run prisma:generate
SPRINT6_TEST_CONFIRM=YES npm run test:admin:payments
```

On Windows Command Prompt:

```bat
set SPRINT6_TEST_CONFIRM=YES
npm run test:admin:payments
```

The regression verifies validation, ledger persistence, early-renewal extension, subscription paid/active state, reporting and audit history.

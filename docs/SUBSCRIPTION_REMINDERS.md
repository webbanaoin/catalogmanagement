# Subscription expiry reminders

## Overview
- Email reminders to ACTIVE shop owners 7, 3 and 1 calendar days before the subscription end date.
- Uses the existing Resend configuration: `RESEND_API_KEY` and `PASSWORD_RESET_FROM_EMAIL`.
- The public application origin is `APP_URL=https://digishowroom.webbanao.in`.
- The subscription screen also displays a renewal notice starting 7 days before expiry.
- Canceled or already expired subscriptions, disabled users, and suspended/rejected shops do not receive pre-expiry reminders.
- A unique MySQL row prevents repeated reminders for the same shop/owner/expiry date/day threshold.
- Failed email calls release the reservation so the next run may retry.
- Admin subscription renewal extends the end date; the new end date gets a new reminder key.
- The email links to `/dashboard/subscription`, where merchant can continue to Payments.

## Schedule on Hostinger
Run `npm run subscriptions:send-reminders` once each day from a secure host-side cron/scheduler.
Select a consistent daily time (e.g. morning India time) and configure the correct working directory.
Do not call this script from a public API and do not expose Resend secrets to the browser.

## Setup
1. Deploy Prisma migration `20261010100000_subscription_reminders`.
2. Confirm `APP_URL`, `RESEND_API_KEY` and verified `PASSWORD_RESET_FROM_EMAIL` are configured in Hostinger.
3. Run `NODE_ENV=production npm run subscriptions:send-reminders` once manually (on the production host with correct credentials).
4. Configure daily scheduler; review logs after initial runs.

## Notes
- Initial reminder delivery uses email only. WhatsApp/SMS is not yet implemented.
- Production email delivery should be tested with a real registered merchant mailbox before general launch.
- If a mail provider accepts a request but the process terminates before recording `sentAt`, the reserved row prevents duplicate send. Operational support may need to investigate pending unsent records.
- Tests must use an isolated database, not production.

# Production monitoring, backup & recovery runbook

## Important
This is the readiness foundation, not a claim that Hostinger backups, offsite retention, alerts or restores are already operational. An operator must configure and validate them during deployment.

## Monitoring
- The existing `GET /api/health` returns 200 with `data.status=ok` and `data.database=ok` if the database responds; 503 otherwise. It never returns DB credentials.
- Execute `npm run ops:healthcheck` with `APP_URL=https://digishowroom.webbanao.in` from a separate trusted system every 5 minutes if supported. Trigger alert after 2 consecutive failures and one recovery notification. Do not rely solely on the application host to monitor itself.
- Check HTTPS certificate expiration and subdomain resolution externally. Track 5xx, deployment errors, slow queries and Resend delivery failures using Hostinger/application logs.
- A green health endpoint does **not** guarantee object storage, mail, payment verification or cron health. Perform manual synthetic smoke tests during deployment.
- Run `npm run subscriptions:send-reminders` once per day in a private scheduled host job, inspect nonzero exit status and delivery logs.

## Backup design
- Use Hostinger MySQL backup facilities if available for the actual plan, and additionally take independent encrypted offsite logical backups with `mysqldump` or `mysqlpump`, consistent with the installed MySQL version.
- Backup database daily and before every production migration. Keep at least 7 daily + 4 weekly copies in access-controlled offsite storage, subject to validated capacity and legal retention obligations.
- Include media **separately**: Cloudflare R2 bucket versioning/lifecycle or independent copies; DB dumps alone cannot restore product photos. Keep application release SHA and environment variable names (never secret values) in the recovery inventory.
- Ensure passwords, email/API secrets, backup URLs and DB dumps never enter Git or public web directories. Restrict decryption keys and regularly rotate backup credentials.
- Verify actual database consistency and media availability, and record backup size, checksum and timestamp. If a scheduled backup fails, alert an operator.

## Manual pre-deployment backup (illustrative only)
1. Confirm the current Hostinger DB host, MySQL version and a backup user with least privilege.
2. From a secured machine, export using environment-supplied credentials (avoid command-line plaintext passwords). Example:
   `mysqldump --defaults-extra-file=/secure/private-mysql.cnf --single-transaction --routines --triggers --set-gtid-purged=OFF DATABASE_NAME > /secure/private-backups/catalog_YYYYMMDD.sql`
   Check available flags for the installed MySQL client/version.
3. Encrypt with an approved tool (e.g. age/GPG), verify checksum, upload to private offsite storage and delete the unencrypted copy securely.
4. Take a Cloudflare R2 snapshot/backup; verify individual product media objects are recoverable.
5. **Before applying migrations**, test importing the dump into an isolated MySQL database and test browsing restored shop/product records; do not restore onto the production database.

## Recovery drill
- Declare incident; stop writes if necessary, save logs and identify last verified clean backup.
- Provision isolated restore DB + recovered media; restore backup to that disposable environment.
- Compare shop, user, product, subscription and payment ledger counts; validate login and storefront image read, and test sensitive authorization flows.
- Determine data-loss interval and agree RPO/RTO with the business. Switch application only after data integrity/security checks and team approval.
- Roll forward a known-good application commit where possible. Prisma migrations may be irreversible: never assume a simple code rollback also rolls back schema.
- Record the drill date, restore duration, operator, integrity checks and remediation items.

## Deployment go/no-go
- Production env variables configured securely; preflight passes.
- TLS and root Vercel portfolio still operational; showroom subdomain resolves to Hostinger.
- Prisma migrations applied after verified DB/media backups.
- Resend test email delivered, R2 uploads fetched, reminders cron verified.
- External health monitor and actual notification recipient configured.
- Restore drill successful. Deployment remains conditional until these operational checks pass.

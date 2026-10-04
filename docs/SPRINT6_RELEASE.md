# Sprint 6 Release and Recovery Runbook

## Environment separation

Maintain separate LOCAL, STAGING and PRODUCTION configuration and databases.

Never reuse:
- `AUTH_SECRET`
- database credentials
- storage credentials
- production reset tokens
- production session cookies

Production `APP_URL` must be the final HTTPS public origin.

## Required production environment

Application:
- `NODE_ENV=production`
- `APP_URL=https://...`
- high-entropy `AUTH_SECRET`

Database:
- production-only MySQL `DATABASE_URL`
- `SHADOW_DATABASE_URL` is for development migration workflows and must not point at the production database

Storage:
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_S3_ENDPOINT` when using R2/S3-compatible storage
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- optional `MEDIA_BASE_URL`

Storage credentials should be limited to the required bucket/prefix operations. Do not expose them to the browser.

## Pre-deployment gate

Before promoting staging:
1. complete `docs/SPRINT6_TEST_PLAN.md`
2. run `npm run release:check`
3. in the production environment run `npm run release:preflight`
4. verify `npx prisma migrate status`
5. complete the Golden Flow
6. create a fresh production database backup
7. verify the current deployed commit/rollback target is known

## Database deployment

Use:

`npm run db:migrate:deploy`

Do not use `prisma migrate dev` against staging or production.

The Sprint 6 migration is additive:
- session version column
- indexes
- audit log table

It does not intentionally remove catalogue or subscription data.

## Application deployment

Recommended order:
1. take database backup
2. deploy migration
3. deploy/build application
4. start/restart application
5. check `/api/health`
6. run `npm run test:sprint6:smoke`
7. perform short authenticated merchant/admin verification
8. scan a real shop QR and open the public storefront

## Database backup

At minimum, keep:
- an immediate pre-release backup
- a regular automated/provider backup if available
- an independently downloadable/exported backup on a recurring schedule

A logical MySQL backup may be created with the hosting/provider backup facility or `mysqldump` when shell access is available.

Protect backups as production data. They may contain merchant contact details, catalogue data and password hashes.

## Object storage recovery

Database backups do not contain image bytes. S3/R2 media must have its own recovery strategy.

Recommended:
- enable provider versioning when affordable/available
- prevent public write access
- retain bucket credentials separately from application source code
- periodically verify that stored DB keys resolve to existing objects

Because business records persist storage keys rather than fixed public URLs, a later CDN/origin change does not require rewriting catalogue records.

## Rollback

Application rollback:
- redeploy the previously known-good application commit

Database rollback:
- prefer forward fixes for additive migrations
- do not manually drop Sprint 6 columns/tables on a live database merely to roll back application code
- restore the pre-release backup only when a destructive or unrecoverable database problem requires it

Old application code can ignore the additive Sprint 6 database fields/tables if an application rollback is needed.

## Recovery verification

A backup is not considered reliable until restore has been tested in a non-production database.

Periodic restore drill:
1. create an isolated database
2. restore the backup
3. apply any later migrations if required
4. point a non-production app instance at the restored DB
5. verify representative shops, products, subscriptions and analytics
6. remove the temporary restored environment

## Operations after release

Recommended recurring tasks:
- password-reset token cleanup using `npm run security:cleanup-reset-tokens`
- database backup verification
- object-storage permission review
- failed health-check monitoring
- disk/database growth review for analytics event tables
- dependency/security update review

# Catalog Management

Catalog Management is the foundation for a multi-tenant Digital Showroom SaaS for local retailers. Phase 1 will let merchants maintain branded catalogues and receive customer enquiries while customers browse without an account. Product scope and architectural decisions live in [`docs/`](docs/).

## Stack

- Next.js App Router, React, strict TypeScript, and Tailwind CSS
- MySQL accessed through Prisma ORM
- AWS S3 for merchant and product media via server-authorized presigned requests
- Zod for validation at server boundaries
- npm for package management

## Prerequisites

- Node.js 20.9 or newer (use a current Node.js LTS release for deployment)
- npm
- MySQL for database-backed development work
- An AWS S3 bucket and least-privilege server credentials for media work

The health endpoint and basic page do not require a running database or AWS account.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and replace every placeholder needed by the area you are developing:

   ```bash
   cp .env.example .env.local
   ```

3. Generate the Prisma Client:

   ```bash
   npm run prisma:generate
   ```

4. Start the application:

   ```bash
   npm run dev
   ```

Open <http://localhost:3000>. Server liveness is available at `GET /api/health` and returns only a status value; it does not assert database or S3 connectivity.

## Environment

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode (`development`, `test`, or `production`) |
| `APP_URL` | Canonical absolute application URL |
| `AUTH_SECRET` | Server-only high-entropy secret of at least 32 characters |
| `DATABASE_URL` | Server-only MySQL connection URL used by Prisma |
| `AWS_REGION` | Region containing the media bucket |
| `AWS_S3_BUCKET` | Private media bucket name |
| `AWS_ACCESS_KEY_ID` | Server-only least-privilege AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | Server-only least-privilege AWS secret |
| `MEDIA_BASE_URL` | Optional HTTPS media/CDN origin; records still store object keys |

Environment groups are validated lazily when their application, database, or storage subsystem is used. This keeps static tooling and the public health check usable without production secrets while ensuring a subsystem fails clearly when its required configuration is absent. None of the sensitive settings use the `NEXT_PUBLIC_` prefix.

Never commit `.env`, `.env.local`, production credentials, or real connection strings.

## Development commands

```bash
npm run dev                 # development server
npm run lint                # ESLint
npm run typecheck           # strict TypeScript check
npm run build               # optimized production build
npm start                   # serve a completed production build
npm run prisma:generate     # generate Prisma Client
npm run prisma:validate     # validate the Prisma schema
npm run db:migrate:dev      # create/apply a migration in development only
npm run db:migrate:status   # inspect migration state
npm run db:studio           # open Prisma Studio
```

`db:migrate:dev` is intentionally named as a development command. Do not point it at staging or production. No Phase 1 business models or migrations are included in Sprint 0.

## Project structure

```text
prisma/                 Prisma schema and future migrations
src/app/                App Router pages and route handlers
src/components/         Shared React components
src/lib/                Framework-independent utilities (as needed)
src/server/             Server-only environment, database, and HTTP concerns
src/services/           External-service abstractions such as S3 storage
src/types/              Shared TypeScript types
src/validation/         Reusable validation entry points
```

Storage callers persist object keys such as `shops/{shopId}/products/{productId}/{uuid}.webp`, not resolved URLs. Future upload APIs must authenticate the user, authorize shop ownership, validate MIME type and size, and only then call the storage service.

## Branch workflow

Create `feature/<developer>-<feature>` branches from the latest `staging`, open pull requests back to `staging`, and prefer squash merges. Tested `staging` changes reach `main` through a separate pull request. Do not commit directly to `staging` or `main`; see [`docs/BRANCHING_STRATEGY.md`](docs/BRANCHING_STRATEGY.md).

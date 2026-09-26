# Branching Strategy

## Permanent branches
- main: production-ready code
- staging: integration and testing

## Temporary branches
- feature/<developer>-<feature>
- fix/<developer>-<bug>
- hotfix/<issue>
- refactor/<developer>-<module>
- chore/<task>

Examples:
feature/prashant-auth
feature/parixit-ui-foundation

## Normal flow
1. Pull latest staging.
2. Create feature branch from staging.
3. Implement/test.
4. Push branch.
5. Open PR to staging.
6. Other developer reviews.
7. Prefer squash merge.
8. Delete merged feature branch.
9. Promote tested staging to main through PR.

Do not normally commit directly to main or staging.

## Hotfix
Create hotfix from main, merge to main after validation, then bring the same fix back into staging.

## Review
Prashant and Parixit review each other's PRs. Shared/high-conflict files such as prisma/schema.prisma, package.json, authentication/middleware configuration, global CSS and Next config require coordination.

## Commit prefixes
feat:, fix:, refactor:, docs:, test:, chore:.

## Release gate
Before staging -> main, verify the Golden Flow and production configuration. Never commit secrets or production .env files.

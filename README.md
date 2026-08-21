# Fisheries Quota Exchange (FQX)

Australian commercial fisheries quota marketplace and, later, exchange infrastructure.

GitHub is the source of truth. The hosted database and Vercel deployment are not.

## Current phase

**Phase 11 — Queensland online signing (PandaDoc)**

See [docs/phase-11.md](docs/phase-11.md). Phase 10 (Queensland transfer process) is complete.

Work happens on `develop`. Merge to `main` for production. See [docs/environments.md](docs/environments.md).

## Technology stack

- Next.js, TypeScript, App Router, Tailwind CSS
- Supabase PostgreSQL
- Vercel hosting
- GitHub Actions for database migrations
- Resend for transactional email (server only)
- Stripe Connect in test mode
- `@react-pdf/renderer` for dummy tax invoice PDFs

## Local development

This is a Next.js App Router project. The homepage lives in `app/page.tsx`.

`package.json` defines `dev`, `lint`, `build`, and `start` scripts. The homepage does not require a local database connection.

Copy `.env.example` to `.env.local` and add the development Supabase URL and publishable key. Do not use the production project.

To send member invitation emails locally, also set `RESEND_API_KEY` and `EMAIL_FROM`. Leave them blank to skip sending.

To run the scheduled email job on Vercel, set `CRON_SECRET`. Locally you can `GET /api/cron/emails` with `Authorization: Bearer $CRON_SECRET`.

To take test Stripe payments, set the Stripe test keys, webhook secret, and `SUPABASE_SERVICE_ROLE_KEY`. Leave them blank to keep simulated purchase.

Never commit `.env.local` or production secrets.

## Testing

Phase 10 adds a Queensland transfer workspace after compliance: generated application PDFs, admin upload of an offline signed pack, and tracked Fisheries Queensland submission. Other jurisdictions still use Simulate transfer. Settlement is unchanged.

Automated test coverage is added where business logic requires it. There is no standing plan for a Vitest or Playwright phase.

## Deployment

Work on `develop`. Merge to `main` when ready.

| Branch | Database | App |
| --- | --- | --- |
| `develop` | Development Supabase | Vercel Preview |
| `main` | Production Supabase | [https://fisheries-quota-exchange.vercel.app/](https://fisheries-quota-exchange.vercel.app/) |

GitHub Actions secrets:

- Shared: `SUPABASE_ACCESS_TOKEN`
- Production (`main`): `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`
- Development (`develop`): `DEVELOPMENT_SUPABASE_DB_PASSWORD`, `DEVELOPMENT_SUPABASE_PROJECT_ID`

See [docs/phase-9.md](docs/phase-9.md), [docs/phase-10.md](docs/phase-10.md), [docs/database.md](docs/database.md), and [docs/environments.md](docs/environments.md).

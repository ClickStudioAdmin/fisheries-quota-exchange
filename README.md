# Fisheries Quota Exchange (FQX)

Australian commercial fisheries quota marketplace and, later, exchange infrastructure.

GitHub is the source of truth. The hosted database and Vercel deployment are not.

## Current phase

**Phase 8 — Auctions**

English auctions with server-side bid timestamps. A winning close creates a simulated Phase 7 order. No Stripe.

See [docs/phase-8.md](docs/phase-8.md).

Work happens on `develop`. Merge to `main` for production. See [docs/environments.md](docs/environments.md).

## Technology stack

- Next.js, TypeScript, App Router, Tailwind CSS
- Supabase PostgreSQL
- Vercel hosting
- GitHub Actions for database migrations
- Resend for transactional email (server only)

## Local development

This is a Next.js App Router project. The homepage lives in `app/page.tsx`.

`package.json` defines `dev`, `lint`, `build`, and `start` scripts. The homepage does not require a local database connection.

Copy `.env.example` to `.env.local` and add the development Supabase URL and publishable key. Do not use the production project.

To send member invitation emails locally, also set `RESEND_API_KEY` and `EMAIL_FROM`. Leave them blank to skip sending.

Never commit `.env.local` or production secrets.

## Testing

Phase 8 acceptance is that a bidder can place and outbid, the auction closes on server time, and a winning close reserves quota.

Later phases will add Vitest and Playwright where the business logic requires it.

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

See [docs/phase-8.md](docs/phase-8.md), [docs/database.md](docs/database.md), and [docs/environments.md](docs/environments.md).

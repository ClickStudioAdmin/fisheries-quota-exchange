# Fisheries Quota Exchange (FQX)

Australian commercial fisheries quota marketplace and, later, exchange infrastructure.

GitHub is the source of truth. The hosted database and Vercel deployment are not.

## Current phase

**Phase 0 — Pipeline proof**

The application only confirms that the development environment works. It does not include marketplace, authentication, organisations, quota, auctions, or payments.

Homepage copy:

- Fisheries Quota Exchange
- FQX development environment is operational.
- Build: 002

Work happens on `develop`. Merge to `main` for production. See [docs/environments.md](docs/environments.md).

## Technology stack

- Next.js, TypeScript, App Router, Tailwind CSS
- Supabase PostgreSQL
- Vercel hosting
- GitHub Actions for database migrations

## Local development

This is a Next.js App Router project. The homepage lives in `app/page.tsx`.

`package.json` defines `dev`, `lint`, `build`, and `start` scripts. Phase 0 does not require a local database connection.

Copy `.env.example` to `.env.local` only if you need local public Supabase values. The Phase 0 homepage does not read them.

Never commit `.env.local` or production secrets.

## Testing

Phase 0 acceptance is the homepage, a valid `system_health` migration, GitHub Actions applying that migration, and Vercel serving the same homepage.

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

See [docs/phase-0.md](docs/phase-0.md) and [docs/environments.md](docs/environments.md).

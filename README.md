# Fisheries Quota Exchange (FQX)

Australian commercial fisheries quota marketplace and, later, exchange infrastructure.

GitHub is the source of truth. The hosted database and Vercel deployment are not.

## Current phase

**Phase 1 — Database pipeline**

Prove that the schema can evolve through GitHub-controlled migrations. This phase adds `organisations` and `organisation_users` only. There is no marketplace or organisation UI.

See [docs/phase-1.md](docs/phase-1.md) and [docs/database.md](docs/database.md).

Work happens on `develop`. Merge to `main` for production. See [docs/environments.md](docs/environments.md).

## Technology stack

- Next.js, TypeScript, App Router, Tailwind CSS
- Supabase PostgreSQL
- Vercel hosting
- GitHub Actions for database migrations

## Local development

This is a Next.js App Router project. The homepage lives in `app/page.tsx`.

`package.json` defines `dev`, `lint`, `build`, and `start` scripts. The homepage does not require a local database connection.

Copy `.env.example` to `.env.local` only if you need local public Supabase values. The homepage does not read them.

Never commit `.env.local` or production secrets.

## Testing

Phase 1 acceptance is a GitHub migration that creates `organisations` and `organisation_users`, GitHub Actions applying it to the development database, and Vercel still building the app.

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

See [docs/phase-1.md](docs/phase-1.md), [docs/database.md](docs/database.md), and [docs/environments.md](docs/environments.md).

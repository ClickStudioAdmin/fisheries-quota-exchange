# Phase 0 — Pipeline proof

## Purpose

Prove that this path works:

Cursor → GitHub → GitHub Actions → Supabase → Vercel

Phase 0 does not implement FQX product features. The application only displays a static homepage.

## Repository

- GitHub: `ClickStudioAdmin/fisheries-quota-exchange`
- Application: Next.js App Router in `app/`
- Database migrations: `supabase/migrations/`
- Migration workflow: `.github/workflows/deploy-database.yml`

GitHub is the source of truth. Do not treat the hosted database or Vercel as the source of truth.

## Application

The homepage in `app/page.tsx` shows:

- Fisheries Quota Exchange
- FQX development environment is operational.
- Build: 001

There is no authentication, marketplace, or database query from the app.

`package.json` includes `dev`, `lint`, `build`, and `start` scripts for local verification when needed.

## Supabase setup

Create a new hosted Supabase project in the [Supabase dashboard](https://supabase.com/dashboard). Use a new project so the first migration is the source of the schema.

You will need three values from the dashboard:

1. **Project ID** — the ref in the project URL: `https://supabase.com/dashboard/project/<project-id>`
2. **Database password** — set when the project is created, or reset under Project Settings → Database
3. **Access token** — create a personal access token under [Account tokens](https://supabase.com/dashboard/account/tokens)

Do not connect local development to this production project. Do not edit production tables in the dashboard as the normal process.

## Migration process

Phase 0 has one migration:

`supabase/migrations/20260816000000_system_health.sql`

It creates `public.system_health` with `id`, `name`, and `created_at`, enables row level security, and inserts one row: `name = FQX`.

Future schema changes must be new migration files in the same folder, committed to GitHub.

## GitHub Actions process

The workflow `.github/workflows/deploy-database.yml` runs on pushes to `develop` and `main`, and when started manually from the Actions tab.

- `develop` applies migrations to the **development** Supabase project.
- `main` applies migrations to the **production** Supabase project.

A successful first apply of `system_health` was confirmed against the production project.

Production repository secrets:

| Secret | Source |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase account token (`sbp_...`) |
| `SUPABASE_DB_PASSWORD` | Production database password |
| `SUPABASE_PROJECT_ID` | Production project ref |

Development repository secrets (required before `develop` can migrate):

| Secret | Source |
| --- | --- |
| `DEVELOPMENT_SUPABASE_DB_PASSWORD` | Development database password |
| `DEVELOPMENT_SUPABASE_PROJECT_ID` | Development project ref |

See [environments.md](environments.md) for the full branch and secret model.

The workflow checks that the secrets exist. It does not print the database password.

## Vercel process

In the [Vercel dashboard](https://vercel.com/dashboard):

1. Import the GitHub repository `ClickStudioAdmin/fisheries-quota-exchange`
2. Framework: Next.js
3. Root directory: repository root
4. Production branch: `main`
5. Phase 0 needs no environment variables

Vercel should create:

- Preview / testing deployments from `develop` and pull requests
- Production deployments from `main` at [https://fisheries-quota-exchange.vercel.app/](https://fisheries-quota-exchange.vercel.app/)

## Environment variables

`.env.example` lists public placeholders only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The Phase 0 homepage does not use them. Do not add service-role keys or Stripe values.

Production secrets belong in GitHub Actions (migrations) or Vercel (later application use).

## Testing

Phase 0 is complete when all of the following are true:

1. Dependencies install from `package.json`
2. Lint succeeds
3. Production build succeeds
4. The local or preview homepage shows the three required lines
5. The `system_health` migration exists on GitHub
6. GitHub Actions applies the migration to the hosted database
7. Supabase Table Editor shows `system_health` with a row named `FQX`
8. Vercel production deploy succeeds
9. The production site shows Build: 001
10. Changing the homepage to Build: 002 and merging to `main` updates production automatically
11. A harmless documentation or workflow change on `main` causes GitHub Actions to run

## Acceptance criteria

- Homepage copy matches the spec
- Exactly one application table: `system_health`
- Migration is in GitHub
- GitHub Actions deploys migrations with secrets
- Vercel serves the homepage
- No later-phase features

## Troubleshooting

**GitHub Actions fails with missing development secrets**  
Add `DEVELOPMENT_SUPABASE_PROJECT_ID` and `DEVELOPMENT_SUPABASE_DB_PASSWORD`. Do not reuse the production project values.

**GitHub Actions fails with missing secrets**  
Add the secrets listed above, then re-run the workflow from the Actions tab.

**GitHub Actions fails on `db push`**  
Confirm the project ID and database password match the hosted project. Do not paste the password into issues or logs.

**Table is missing in Supabase**  
Open the failed Actions run. Do not create the table in the SQL editor unless recovering from an emergency.

**Vercel build fails**  
Open the Vercel deployment log. Phase 0 has no required Vercel environment variables.

**Homepage is blank or old**  
Confirm the deployment is from `main` and that `app/page.tsx` contains the expected copy.

**Local app cannot reach production data**  
That is expected. Phase 0 does not connect the app to the database.

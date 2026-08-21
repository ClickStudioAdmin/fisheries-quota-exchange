# Environments

FQX uses two hosted environments. GitHub is the source of truth for both.

| Git branch | Supabase | Vercel | When to use |
| --- | --- | --- | --- |
| `develop` | Development project | Preview / testing URL | Daily work and Phase development |
| `main` | Production project | [https://fisheries-quota-exchange.vercel.app/](https://fisheries-quota-exchange.vercel.app/) | After you are happy on `develop` |

Do not point `develop` at the production database. Do not point local work at the production database.

## Branch flow

1. Do work on `develop`.
2. Push `develop`. GitHub Actions applies migrations to **development** Supabase. Vercel builds a testing deployment from `develop`.
3. Check the development database and the Vercel testing URL.
4. Merge `develop` into `main` when happy.
5. Push/merge to `main` applies migrations to **production** Supabase and deploys [https://fisheries-quota-exchange.vercel.app/](https://fisheries-quota-exchange.vercel.app/).

## GitHub Actions

[`.github/workflows/deploy-database.yml`](../.github/workflows/deploy-database.yml) runs on pushes to `develop` and `main`.

- `develop` runs **Apply development migrations** and uses GitHub Environment `development`.
- `main` runs **Apply production migrations** and uses GitHub Environment `production`.

Development secrets are separate names so a missing development secret fails the job instead of falling back to production.

### Repository secrets

Keep the existing production secrets:

| Secret | Used by |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Both (`sbp_...` personal access token) |
| `SUPABASE_DB_PASSWORD` | `main` only |
| `SUPABASE_PROJECT_ID` | `main` only |

Add these for development:

| Secret | Used by |
| --- | --- |
| `DEVELOPMENT_SUPABASE_DB_PASSWORD` | `develop` only |
| `DEVELOPMENT_SUPABASE_PROJECT_ID` | `develop` only |

Create GitHub Environments named `development` and `production` under **Settings → Environments**. Protection rules on `production` are optional.

You can store the `DEVELOPMENT_*` values as repository secrets (simplest) or as secrets on the `development` environment. Do not put the production database password in the `development` environment.

## Supabase

Create a **second** hosted project for development. Do not reuse the production project.

The first push to `develop` after secrets are set will apply existing migrations, including `system_health`, to the empty development database.

## Vercel

Production stays on `main`.

Pushes to `develop` should create a Preview deployment automatically. Use that URL for testing. It is not the production domain.

Stripe webhooks cannot log in to Vercel. If Preview **Deployment Protection** (Vercel Authentication) is on, Stripe POSTs get the Vercel login page and the endpoint is marked failing. Turn protection off for Preview, or give `develop` a public URL. In the Stripe test Dashboard, the endpoint must be exactly:

`https://<preview-host>/api/stripe/webhook`

The PandaDoc webhook has the same rules. Use exactly:

`https://<preview-host>/api/pandadoc/webhook`

Do not put a trailing slash on the host (`…vercel.app//api/…` fails) or on the path (`…/webhook/` returns 308, and Stripe does not follow redirects). After changing the URL or protection, send a test event from Stripe. Opening an unpaid order still reconciles payment if a webhook was missed. Opening a Queensland Sign online order reconciles PandaDoc status if a webhook was missed.

When the app starts using Supabase from the browser, set Vercel environment variables by environment:

| Variable | Preview / `develop` | Production / `main` |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Development project URL | Production project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Development publishable key | Production publishable key |
| `RESEND_API_KEY` | Development Resend key | Production Resend key |
| `EMAIL_FROM` | Test sender: `FQX <beth.t@example.com>` | Verified domain, e.g. `FQX <noreply@yourdomain>` |
| `CRON_SECRET` | Shared secret for `/api/cron/emails` | Same name, production value |
| `STRIPE_SECRET_KEY` | Stripe test secret (`sk_test_...`) | Keep test keys until live mode is a later phase |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe test publishable (`pk_test_...`) | Test publishable until live mode |
| `STRIPE_WEBHOOK_SECRET` | Sandbox webhook secret | Sandbox or later live webhook secret |
| `PANDADOC_API_KEY` | PandaDoc sandbox API key | Sandbox key until a later live-key phase |
| `PANDADOC_WEBHOOK_SHARED_KEY` | PandaDoc webhook HMAC key | Sandbox webhook key |
| `SUPABASE_SERVICE_ROLE_KEY` | Development service role | Production service role |

Supabase variables are required from Phase 3. Resend variables are needed to send product email. `CRON_SECRET` is required for the scheduled email job on Vercel. Stripe test keys and the service-role key are needed from Phase 9 to take payments. PandaDoc sandbox keys are needed from Phase 11 for Queensland Sign online; Offline pack still works if they are unset. After adding them, redeploy. Do not add service-role keys, Resend keys, `CRON_SECRET`, Stripe secrets, or PandaDoc keys to the frontend except `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. If Stripe is unset, purchases stay simulated. In the Stripe test Dashboard, add Radar rule `Block if :card_country: != 'AU'` so only Australian-issued cards are accepted (see [phase-9.md](phase-9.md)).

Auth redirect URLs must be set on each Supabase project. See [phase-3.md](phase-3.md).

## Merge to production

Open a pull request from `develop` into `main`. After merge:

- Vercel production updates
- GitHub Actions applies any new migrations to production Supabase

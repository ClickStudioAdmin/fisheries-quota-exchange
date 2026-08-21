# Fisheries Quota Exchange (FQX)

Master development specification, version 3.2.

This document is the canonical development specification for FQX.

Current implementation phase: Phase 10 complete. Further work waits for a new phase document under `docs/`. See [phase-10.md](phase-10.md).

## Development philosophy

- Build incrementally.
- Complete one phase at a time.
- Never build future phases early.
- Every phase must produce a working application.
- Every phase must pass its acceptance tests.
- GitHub is the source of truth.
- Database schema changes must be version-controlled in GitHub.
- Hosted Supabase database migrations should be deployed through GitHub Actions wherever possible.
- Do not rely on manually editing the production Supabase database.

## 1. Product

Product name: Fisheries Quota Exchange

Abbreviation: FQX

Market: Australia

Product type: Commercial fisheries quota marketplace and, eventually, exchange infrastructure.

Long-term capabilities:

- quota marketplace
- fixed-price sales
- negotiated offers
- auctions
- quota leasing
- transaction management
- compliance workflows
- quota transfers
- payment collection
- platform fees
- settlement
- seller balances
- seller payouts
- market data
- analytics
- eventually exchange-style matching

The long-term platform must support Australian Commonwealth, State and Territory fisheries.

Do not assume all fisheries use the same quota units, rules, authorities or transfer processes.

## 2. Development principles

FQX must be developed incrementally.

Each phase must:

1. Have one clearly defined objective.
2. Be small enough to test independently.
3. Have explicit acceptance criteria.
4. Have automated tests where appropriate.
5. Pass lint.
6. Pass production build.
7. Be committed to GitHub.
8. Deploy successfully through Vercel.
9. Have database changes represented by Supabase migrations.
10. Have production database migrations deployed through GitHub Actions where possible.
11. Never require manual editing of the production database as the normal deployment process.
12. Update documentation when architecture changes.

Do not build future phases early.

Do not add unnecessary dependencies.

Do not create speculative architecture unless required by the current phase.

## 3. Source of truth

GitHub is the source of truth for application code, database migrations, configuration, documentation, tests, and CI/CD workflows.

The production Supabase database is not the source of truth.

The Vercel production deployment is not the source of truth.

## 4. Target development pipeline

Developer → Cursor → GitHub branch → Pull Request → Vercel Preview and GitHub Actions.

GitHub Actions applies Supabase migrations to hosted Supabase.

`main` deploys the application on Vercel and migrations through GitHub Actions.

Database migrations must be executed by CI/CD rather than requiring the developer to apply them to production by hand.

## 5. Technology stack

- Next.js, TypeScript, App Router, Tailwind CSS
- Supabase PostgreSQL and Supabase Auth
- Resend for transactional email (server only)
- Stripe Connect in test mode
- `@react-pdf/renderer` for dummy tax invoice PDFs
- `pdf-lib` to pre-fill official Queensland FDU1465 sale and FDU1469 lease applications
- Vercel
- GitHub and GitHub Actions
- Cursor
- Supabase CLI migrations deployed by GitHub Actions
- Vitest and Playwright later
- Zod where appropriate

## 6. Repository

Repository name: `fisheries-quota-exchange`

Do not create files that are not required.

## 7. Environment model

There will eventually be Development, Preview, and Production.

At minimum: Supabase Development, Supabase Production, Vercel Preview, Vercel Production.

Do not connect local development directly to the production database.

Do not put production secrets in the repository.

## 8. Secret management

Never commit secrets.

Never put secrets in GitHub source code, committed `.env` files, frontend JavaScript, or public environment variables unless they are designed to be public.

Use `.env.local` locally, Vercel environment variables for the hosted app, and GitHub Actions secrets for migration deployment.

Production Supabase credentials must only be available to GitHub Actions when required.

## 9. Database migration strategy

All database schema changes must be represented as Supabase migration files under `supabase/migrations/`.

Never make production schema changes by manually editing tables in the Supabase dashboard except for emergency recovery or administrative operations.

Normal process: create a migration, commit it, open a pull request, review, merge to `main`, GitHub Actions applies it, Vercel deploys the application.

For Phase 0, database migration deployment is the primary CI/CD test.

## 10. Phase 0 — Pipeline proof

Completed.

Objective: prove Cursor → GitHub → GitHub Actions → Supabase → Vercel works.

Do not build FQX functionality.

The application should only display:

- Fisheries Quota Exchange
- FQX development environment is operational.
- Build: 001

## 11–19. Phase 0 scope

Create the smallest reasonable Next.js application with a responsive homepage.

Create exactly one database table, `system_health`, with `id`, `name`, and `created_at`, and one row named `FQX`.

Create `.github/workflows/deploy-database.yml` to apply migrations on pushes to `main`.

Connect the GitHub repository to Vercel for pull request previews and `main` production deployments.

Document the phase in `docs/phase-0.md` and the repository in `README.md`.

Phase 0 is complete only when the homepage, migration, GitHub Actions deploy, and Vercel deploy all succeed, including a Build 001 → 002 production update and a harmless workflow or documentation change that triggers Actions.

After Phase 0 acceptance tests pass: stop. Do not build Phase 1.

## 20. Phase 1 — Database pipeline

Prove that the FQX schema can evolve through GitHub-controlled migrations by adding `organisations` and `organisation_users`. Do not add marketplace functionality.

## 21. Phase 2 — Application shell

Create `/`, `/marketplace`, `/fisheries`, `/auctions`, and `/about` with header, navigation, footer, and placeholder pages.

## 22. Phase 3 — Authentication

Supabase Auth, registration, login, logout, password reset, and a protected dashboard.

## 23. Phase 4 — Organisations

Organisation creation, profile, membership, roles (`OWNER`, `ADMIN`, `MEMBER`), and permissions.

## 24. Phase 5 — Fisheries and quota data

Jurisdictions, fisheries, quota types, fishery rules, holdings, and an immutable quota ledger. Do not assume quota is always measured in weight.

## 25. Phase 6 — Listings

Seller quota listings. Initial type: `FIXED_PRICE`. No auctions.

## 26. Phase 7 — Test transactions

Transaction workflow without live payments. No double-selling. Ledger remains consistent.

## 27. Phase 8 — Auctions

Server-side auction logic. Never rely on client-side bid timestamps.

## 28. Phase 9 — Stripe test payments

Stripe Connect in test mode behind a `PaymentProvider` abstraction. Separate charges and transfers. Idempotent webhooks.

**Complete.** See [phase-9.md](phase-9.md).

## 29. Phase 10 — Queensland transfer process (foundation)

Jurisdiction-specific transfer after payment and compliance. Queensland sales and leases generate stored application PDFs from business details. The seller signs first and uploads; admin checks that file before the buyer can download it; admin records Fisheries Queensland submission. Other jurisdictions keep simulated transfer. Approved QLD applications hand off to existing `simulate_transfer` and settlement. No live e-sign and no FQ API.

**Complete.** See [phase-10.md](phase-10.md).

## 30. Later phases

Phases after 10 are not pre-planned. A new phase starts only when its objective, scope, and acceptance criteria are written under `docs/`.

Do not implement a previously sketched Phase 11+ (live e-sign, FQ portal/API, other jurisdictions’ real processes, settlement ledger, seller bank payouts, market-data expansion, closed beta, public launch, or exchange matching) unless a new phase document asks for that work.

## 31. Long-term architecture

Every table must be justified by an actual feature. Do not create all tables during early phases.

Quota and financial ledgers are immutable. Never delete historical entries. Never directly edit balances.

Never trust the browser for payment, bid, quota, balance, payout, settlement, or admin state.

## 32. Cursor rules

Project rules in `.cursor/rules/` enforce phase discipline, GitHub as source of truth, migration-only schema changes, secret handling, and the stop condition at the end of each phase.

# Phase 1 — Database pipeline

## Purpose

Prove that the FQX schema can evolve through GitHub-controlled migrations.

Phase 1 adds organisation tables only. It does not add marketplace functionality, authentication, or organisation UI.

## Tables

### organisations

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint identity | Primary key |
| `legal_name` | text not null | Registered name |
| `trading_name` | text | Optional |
| `abn` | text | Optional, unique when present |
| `created_at` | timestamptz not null | Default `now()` |
| `updated_at` | timestamptz not null | Default `now()`, set on update |

### organisation_users

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint identity | Primary key |
| `organisation_id` | bigint not null | Foreign key to `organisations.id` |
| `email` | text not null | Unique per organisation |
| `role` | text not null | `OWNER`, `ADMIN`, or `MEMBER` |
| `created_at` | timestamptz not null | Default `now()` |

Roles are constrained in the database. Membership is keyed by email until Phase 3 adds authentication.

Row Level Security is enabled on both tables with no policies. The Data API cannot read or write these rows until later phases add auth-aware policies.

## Migration

`supabase/migrations/20260816120000_add_organisations.sql`

Push `develop` to apply this to the development database. Merge to `main` to apply it to production.

Do not create these tables in the Supabase dashboard.

## Application

The homepage is unchanged. Phase 1 is a schema change, not a product UI change.

## Not in this phase

- Login, registration, or Supabase Auth
- Organisation create/edit screens
- Quota, listings, auctions, payments
- Seed organisation rows

## Acceptance criteria

- Migration is committed on GitHub
- Push to `develop` applies the migration to development Supabase
- Development database contains `organisations` and `organisation_users` with the expected columns and role check
- Vercel Preview for `develop` still builds
- Production is unchanged until `develop` is merged to `main`
- After merge, production migration succeeds and Vercel production still builds

## Troubleshooting

**Actions failed on `db push`**  
Open the failed **Apply development migrations** run. Do not create the tables by hand.

**Tables missing in development**  
Confirm you pushed `develop` and that the workflow targeted the development project, not production.

**Cannot read rows from the Table Editor as anon**  
Expected. RLS is on. Use the dashboard Table Editor (which uses a privileged connection) to inspect schema.

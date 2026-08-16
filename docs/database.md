# Database

GitHub migrations in `supabase/migrations/` are the source of truth. Do not edit hosted schemas by hand as the normal process.

Current tables:

| Table | Phase | Purpose |
| --- | --- | --- |
| `system_health` | 0 | Pipeline proof. One row: `FQX`. |
| `organisations` | 1 | Legal entity that will later hold quota and membership. |
| `organisation_users` | 1 | Email membership and role on an organisation. |

`organisation_users.role` must be `OWNER`, `ADMIN`, or `MEMBER`.

Row Level Security is enabled. From Phase 4, authenticated members can only read organisations they belong to. Writes follow the role rules in [phase-4.md](phase-4.md).

Do not add later-phase tables (quota, listings, auctions, payments, ledgers) until that phase starts.

See [phase-1.md](phase-1.md) for column detail and [environments.md](environments.md) for which database each branch updates.

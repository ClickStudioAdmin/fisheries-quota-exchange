# Database

GitHub migrations in `supabase/migrations/` are the source of truth. Do not edit hosted schemas by hand as the normal process.

Current tables:

| Table | Phase | Purpose |
| --- | --- | --- |
| `system_health` | 0 | Pipeline proof. One row: `FQX`. |
| `organisations` | 1 | Legal entity. |
| `organisation_users` | 1 | Email membership and role. |
| `platform_admins` | 5 | Platform administrators. |
| `jurisdictions` | 5 | Australian jurisdictions. |
| `authorities` | 5 | Fisheries authorities. |
| `fisheries` | 5 | Managed fisheries. |
| `species` | 5 | Species. |
| `stocks` | 5 | Species/stock within a fishery. |
| `seasons` | 5 | Fishery seasons. |
| `quota_types` | 5 | Measurement kind and unit label. |
| `fishery_rules` | 5 | Configurable rules. |
| `quota_holdings` | 5 | Organisation quota balances. |
| `quota_ledger` | 5 | Immutable quota events. |

`organisation_users.role` must be `OWNER`, `ADMIN`, or `MEMBER`.

`quota_types.measurement_kind` must be `WEIGHT`, `UNITS`, `EFFORT`, or `OTHER`.

`quota_ledger` is immutable. Corrections later require adjustment or reversal rows.

See [phase-4.md](phase-4.md) and [phase-5.md](phase-5.md).

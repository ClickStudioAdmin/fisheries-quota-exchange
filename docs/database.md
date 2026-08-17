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
| `fisheries` | 5 | Managed fisheries under a jurisdiction. `quantity_type` is `KG` or `UNITS`. `logo_path` is an optional image in the `fishery-logos` storage bucket. |
| `quota_types` | 5 | Measurement kind and unit label. |
| `fishery_rules` | 5 | Configurable rules. |
| `quota_holdings` | 5 | Organisation quota balance per fishery. `verification_status` is `PENDING_VERIFICATION` or `VERIFIED`. |
| `quota_ledger` | 5 | Immutable quota events. |
| `verified_users` | 8 | Emails whose holdings skip admin verification. |
| `listings` | 6–8 | Fixed-price or auction offers. |
| `orders` | 7 | Simulated purchase of a listing or winning auction. |
| `quota_reservations` | 7 | Active reserved quantity against a holding. |
| `transactions` | 7 | Simulated settlement record. No live payment. |
| `audit_events` | 7 | Order workflow audit. |
| `bids` | 8 | Auction bids. `created_at` is server time. |

`organisation_users.role` must be `OWNER`, `ADMIN`, or `MEMBER`. Changing an Auth user's email updates matching `organisation_users.email` rows via trigger `sync_organisation_user_email`.

`fisheries.quantity_type` must be `KG` or `UNITS`. Holdings and listings show that unit beside quantity.

`quota_types.measurement_kind` must be `WEIGHT`, `UNITS`, `EFFORT`, or `OTHER`. Holdings are per organisation and fishery, not per quota type.

`quota_ledger` is immutable. Corrections later require adjustment or reversal rows. Holding quantity is written only by `create_quota_holding` and `apply_quota_event`. Members change quantity through `adjust_quota_holding`, which writes an `ADJUSTMENT` ledger row. A holding cannot be reduced below the quantity on its open listings (`PENDING_APPROVAL` and `PUBLISHED`) plus active reservations. A listing cannot be created without a covering holding.

Creating or changing a holding sets `VERIFIED` only if the actor is in `verified_users`. Otherwise it is `PENDING_VERIFICATION`, including when a platform admin updates a holding for an unverified account. A listing or auction cannot be created from an unverified holding. Platform admin verifies holdings on `/admin/holdings` and users on `/admin/users`. `/admin/users/[email]` is an admin-only record of that person, including holdings in their accounts. `admin_delete_users` removes selected users from `organisation_users`, `verified_users`, and `platform_admins`. Admins cannot delete themselves or the last platform admin. Organisations and quota ledgers stay in place.

Anonymous visitors can read `fisheries` and `jurisdictions`. Sale and lease prices for `/fisheries/[id]` come from `list_market_sales` (quantity, unit price, and offering only). Holding valuation uses `latest_sale_prices` and SALE prices only. Fishery logos are public files in the `fishery-logos` bucket; only platform admins can upload, replace, or remove them.

Development fixtures may include extra fisheries, organisations, users, listings, and completed trades for local and development display. They are not official regulatory or market data.

See [phase-4.md](phase-4.md), [phase-5.md](phase-5.md), [phase-6.md](phase-6.md), [phase-7.md](phase-7.md) and [phase-8.md](phase-8.md).

# Database

GitHub migrations in `supabase/migrations/` are the source of truth. Do not edit hosted schemas by hand as the normal process.

Current tables:

| Table | Phase | Purpose |
| --- | --- | --- |
| `system_health` | 0 | Pipeline proof. One row: `FQX`. |
| `organisations` | 1 | Legal entity. |
| `organisation_users` | 1 | Email membership, role, and display name. |
| `platform_admins` | 5 | Platform administrators. |
| `jurisdictions` | 5 | Australian jurisdictions. |
| `fisheries` | 5 | Managed fisheries under a jurisdiction. `quantity_type` is `KG` or `UNITS`. `logo_path` is an optional image in the `fishery-logos` storage bucket. |
| `quota_types` | 5 | Measurement kind and unit label. |
| `fishery_rules` | 5 | Configurable rules. |
| `quota_holdings` | 5 | Organisation quota balance per fishery. `verification_status` is `PENDING_VERIFICATION` or `VERIFIED`. |
| `quota_ledger` | 5 | Immutable quota events. |
| `verified_users` | 8 | Emails whose holdings skip admin verification. |
| `listings` | 6–8 | Fixed-price or auction offers. Sellers can change quantity and unit price on an open fixed-price listing when the holding still covers it. An auction with bids cannot be cancelled. |
| `orders` | 7 | Simulated purchase of a listing or winning auction. |
| `quota_reservations` | 7 | Active reserved quantity against a holding. |
| `transactions` | 7 | Simulated settlement record. No live payment. |
| `payments` | 9 | Stripe Checkout / PaymentIntent for an order. `stripe_transfer_id` after settlement Transfer to the seller. |
| `stripe_webhook_events` | 9 | Processed Stripe event ids (idempotency). |
| `audit_events` | 7 | Order workflow audit. |
| `bids` | 8 | Auction bids. `created_at` is server time. |
| `platform_settings` | 8–9 | Singleton: sale/lease fee %, registrations, auto-approve holdings/listings, `disabled_emails`. |
| `email_dispatches` | 9 | One-shot transactional mail keys (`template` + `entity_key`). |
| `user_email_preferences` | 9 | Per-email opt-outs for product emails. |
| `listing_alerts` | 9 | Per-email fishery sale/lease listing alerts. |

`organisation_users.role` must be `OWNER`, `ADMIN`, or `MEMBER`. `organisation_users.full_name` is required. Auth metadata still overrides that name when present. The insert trigger `organisation_users_fill_name` reads `auth.users` as `security definer` so adding a member does not require the signed-in role to select from Auth. Changing an Auth user's email updates matching `organisation_users.email` rows via trigger `sync_organisation_user_email`. Changing Auth name updates `organisation_users.full_name`. Platform admins also read name and phone from Auth metadata through `admin_auth_person` and `admin_auth_people`. `/admin/listings` reads through `admin_list_listings` so the full catalogue is not evaluated under four SELECT policies. Admin menu badges use `admin_action_counts` (holdings pending verification, listings pending approval, and open orders).

`organisations` may store a Stripe Connect account id and charge flags. Members cannot change those columns; `attach_organisation_stripe_account` and the signed `account.updated` webhook do. `orders.status` may be `AWAITING_PAYMENT` until a signed webhook marks the order paid. The buyer pays the listed quota amount plus Stripe's card processing fee. That charge sits on the FQX Stripe balance until Simulate settlement Transfers the seller net (`amount_aud` minus the platform fee). `payments` and `stripe_webhook_events` are written by the app server. The browser is not trusted for payment status.

`fisheries.quantity_type` must be `KG` or `UNITS`. Holdings and listings show that unit beside quantity.

`quota_types.measurement_kind` must be `WEIGHT`, `UNITS`, `EFFORT`, or `OTHER`. Holdings are per organisation and fishery, not per quota type.

`quota_ledger` is immutable. Corrections later require adjustment or reversal rows. Holding quantity is written only by `create_quota_holding` and `apply_quota_event`. Members change quantity through `adjust_quota_holding`, which writes an `ADJUSTMENT` ledger row. A holding cannot be reduced below the quantity on its open listings (`PENDING_APPROVAL` and `PUBLISHED`) plus active reservations. A listing cannot be created without a covering holding.

Creating or changing a holding sets `VERIFIED` only if the actor is in `verified_users` and `platform_settings.auto_approve_holdings` is on. Otherwise it is `PENDING_VERIFICATION`, including when a platform admin updates a holding for an unverified account. A listing or auction cannot be created from an unverified holding. If `auto_approve_listings` is on, a verified holder’s new listing or auction is published immediately; otherwise it waits on `/admin/listings`. Platform admin verifies holdings on `/admin/holdings` and users on `/admin/users`. `/admin/users/[email]` is an admin-only record of that person, including holdings in their accounts. `/admin/holdings/[id]` and `/dashboard/holdings/[id]` show the holding, its ledger, and related listings and orders. `admin_delete_users` removes selected users from `organisation_users`, `verified_users`, and `platform_admins`. Admins cannot delete themselves or the last platform admin. Organisations and quota ledgers stay in place.

`platform_settings` is one row. Platform admins change it on `/admin/settings`. Sale and lease fees are separate percentages, snapshotted onto each new order. The buyer pays the listed amount; the fee is deducted from the seller at settlement. `allow_registrations` is enforced in `registerAction`, not only in the browser. `disabled_emails` lists product email ids that must not be sent; actions still succeed.

Anonymous visitors can read `fisheries` and `jurisdictions`. Sale and lease prices for `/fisheries/[id]` come from `list_market_sales` (quantity, unit price, and offering only). Holding valuation uses `latest_sale_prices` and SALE prices only. Fishery logos are public files in the `fishery-logos` bucket; only platform admins can upload, replace, or remove them.

Development fixtures may include extra fisheries, organisations, users, listings, and completed trades for local and development display. They are not official regulatory or market data.

See [phase-4.md](phase-4.md), [phase-5.md](phase-5.md), [phase-6.md](phase-6.md), [phase-7.md](phase-7.md), [phase-8.md](phase-8.md) and [phase-9.md](phase-9.md).

Transactional email is sent from the app server with Resend after the database write. Auth confirmation and password reset stay on Supabase Auth. Each product email can be disabled globally on `/admin/settings` or per user on `/dashboard/notifications`. Users subscribe to new sale/lease listings per fishery on `/dashboard/alerts`. One-shot mail is recorded in `email_dispatches`. Simulated settlement emails dummy tax invoice PDFs generated in the app (quota and platform fee) to buyer and seller managers; the PDFs are not stored in the database. Buyer and seller can download them from `/orders/[id]` after settlement. See [phase-9.md](phase-9.md).

# Phase 7 — Test transactions

## Purpose

Let a buyer purchase a published listing without live payments.

The database creates an order, reserves quota so it cannot be sold twice, then a platform admin runs compliance, transfer, and settlement simulation. Settlement writes immutable quota ledger rows.

Do not implement auctions, Stripe, real payouts, or authority adapters in this phase.

## Flow

1. Buyer (any member of a different organisation) purchases a `PUBLISHED` listing.
2. `create_order` locks the listing and holding, checks unreserved quantity, creates the order, an `ACTIVE` reservation, and a `PENDING` simulated transaction, and sets the listing to `RESERVED`.
3. Platform admin approves compliance (`AWAITING_TRANSFER`) or rejects it (reservation released, listing returns to `PUBLISHED` if it has not expired).
4. Admin simulates transfer (`AWAITING_SETTLEMENT`).
5. Admin simulates settlement (`COMPLETED`): seller ledger `SALE` or `LEASE_OUT`, buyer ledger `PURCHASE` or `LEASE_IN`, reservation `CONSUMED`, listing `SOLD`, transaction `COMPLETED`. The app then emails a dummy tax invoice PDF to the buyer (`created_by_email`). Buyer and seller can download the same PDF from `/orders/[id]` after settlement. Settlement still completes if mail is skipped or fails.

A second purchase of the same listing fails because it is no longer `PUBLISHED`. A purchase that would exceed remaining unreserved holding quantity fails with “Quota is no longer available”.

## Pages

| Path | Purpose |
| --- | --- |
| `/marketplace/[id]` | Purchase (reserves quota) |
| `/orders/[id]` | Order, reservation, simulated transaction, audit |
| `/dashboard/orders` | Buys and sells for the selected account |
| `/admin/orders` | Compliance, transfer, and settlement simulation |

## Database

Tables: `orders`, `quota_reservations`, `transactions`, `audit_events`.

Functions:

- `create_order`
- `cancel_order`
- `approve_compliance`
- `reject_compliance`
- `simulate_transfer`
- `simulate_settlement`

Holding quantity is only changed by `create_quota_holding` and `apply_quota_event` (the latter is not granted to clients). `quota_ledger` remains immutable.

## Not in this phase

- Stripe or any live payment
- Auctions
- Seller payouts
- Authority transfer adapters

## Acceptance criteria

- Buyer can complete a simulated purchase
- Quota cannot be sold twice
- Seller and buyer quota ledgers stay consistent
- Push to `develop` applies the migration
- Vercel Preview build succeeds

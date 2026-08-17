# Phase 6 — Listings

## Purpose

Let a seller create a fixed-price quota listing. A platform admin approves it. Buyers can then see it on the marketplace.

Do not implement auctions, payments, or quota reservation in this phase.

## Flow

1. Organisation `OWNER` or `ADMIN` creates a listing from a holding.
2. Status is `PENDING_APPROVAL`.
3. Platform admin approves (`PUBLISHED`) or rejects (`REJECTED`).
4. Seller or admin can cancel (`CANCELLED`).
5. `/marketplace` shows published listings that have not expired.

Listing type is `FIXED_PRICE` only. Offering is `SALE` or `LEASE`.

Quantity cannot exceed the holding at create time. The holding quantity is not reduced until a later transaction phase.

## Pages

| Path | Purpose |
| --- | --- |
| `/marketplace` | Published listings |
| `/marketplace/[id]` | Listing detail |
| `/dashboard/listings` | Seller listings for the selected account |
| `/organisations/[id]/listings/new` | Create listing from a holding |
| `/admin/listings` | Approve or reject |

## Database

`listings` stores the offer plus a snapshot of fishery name and unit label (`kg` or `units`, from the fishery’s quantity type) so the marketplace can show published rows without exposing private holdings.

Functions:

- `create_listing`
- `approve_listing`
- `reject_listing`
- `cancel_listing`

## Not in this phase

- Buy / checkout
- Auctions
- Ledger `SALE` / `LEASE_OUT` events
- Quota reservation

## Acceptance criteria

- Seller can create a listing
- Admin can approve it
- Buyer can see it on `/marketplace`
- Push to `develop` applies the migration
- Vercel Preview build succeeds

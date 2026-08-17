# Phase 8 — Auctions

## Purpose

Add English auctions with server-side bid logic. Bid time and close time come from the database, never from the browser.

A winning close creates a Phase 7 simulated order and reserves quota. There is no live payment.

Do not implement Stripe, seller payouts, or authority adapters in this phase.

## Flow

1. Organisation `OWNER` or `ADMIN` creates an auction from a **verified** holding (`starting` price, increment, optional reserve, start, end).
2. Status is `PENDING_APPROVAL`. Platform admin approves it (`PUBLISHED`) on `/admin/listings`.
3. A member of a different organisation places a bid. `place_bid` locks the listing, compares `now()` to start/end, and stores `bids.created_at` with `now()`.
4. A later bid must be at least the current price plus the increment.
5. After `expires_at`, a signed-in user closes the auction (automatic on the auction page, or the Close button). Close uses server time.
6. If the highest bid meets the reserve (or there is no reserve), `close_auction` creates an order, reserves quota, and sets the listing to `RESERVED`. Admin then runs the Phase 7 compliance / transfer / settlement steps.
7. If there is no qualifying bid, status becomes `UNSOLD` and the quantity is available again.

## Pages

| Path | Purpose |
| --- | --- |
| `/marketplace` | Fixed-price listings and auctions, filterable by jurisdiction, fishery, listing type and sale/lease, sorted by price or quantity, 20 per page |
| `/marketplace/[id]` | Fixed-price listing detail and purchase |
| `/auctions` | Redirects to Marketplace |
| `/auctions/[id]` | Bid, history, close |
| `/fisheries` | Public list of fisheries |
| `/fisheries/[id]` | Last and average sale and lease prices, current sale and lease listings, historical sale and lease price charts |
| `/dashboard/holdings` | Create an auction from a holding. Holding value uses the latest sale. |
| `/dashboard/holdings/[id]` | Holding record: quantity, listed/available, ledger, listings, and orders |
| `/organisations/[id]/auctions/new` | Create auction from a holding |
| `/admin/listings` | Approve auctions as well as fixed-price listings |
| `/admin/users` | Verify users so their holdings skip approval, or remove selected users from all accounts |
| `/admin/users/[email]` | Admin-only user record: name, email, phone, accounts, holdings, listings, and orders |
| `/admin/holdings` | Verify holdings created or changed by unverified users |
| `/admin/holdings/[id]` | Admin-only holding record, including the immutable quota ledger |
| `/admin/reference/fisheries/[id]` | Same fields as create: jurisdiction, name, code, quantity type, and logo |

## Database

`listings.listing_type` may be `FIXED_PRICE` or `AUCTION`. Auction rows add starting price, increment, optional reserve, and `starts_at`. End time reuses `expires_at`.

`bids` stores each bid. `created_at` is always the database clock.

Functions:

- `create_auction`
- `place_bid`
- `close_auction`
- `admin_auth_person` (platform admin only; name and phone from Auth metadata)
- `admin_auth_people` (platform admin only; names and phones for the users table)

Public market data (no buyer or seller identity):

- `list_open_listings_for_fishery`
- `list_market_sales` (sale and lease prices; no identities)
- `latest_sale_prices`

Fisheries and jurisdictions are readable by anonymous visitors. Holding valuation is quantity × most recent `SALE` unit price for that fishery. `fisheries.logo_path` points at a public object in the `fishery-logos` bucket. Platform admins upload, replace, or remove logos.

Open listings must be covered by the seller holding. `adjust_quota_holding` cannot reduce quantity below `holding_committed_quantity`. Uncovered listings from earlier data are cancelled by migration `20260817180000_listing_holding_cover.sql`.

`stocks` and `seasons` are removed by `20260817260000_drop_stocks_and_seasons.sql`. Listings and orders no longer snapshot those names.

Development fixture `20260817230000_seed_market_catalogue.sql` adds Australian fisheries by jurisdiction, seed organisations and users, holdings, live listings and auctions, and historical trades for fishery price charts. These are test records, not official market data.

`insert_simulated_order` is shared with Phase 7 `create_order` and is not granted to clients.

## Not in this phase

- Stripe or any live payment
- Dutch or sealed-bid formats
- Seller payouts
- Authority transfer adapters

## Acceptance criteria

- Place a bid
- Outbid another bid
- Auction closes using server time
- Winning close reserves quota and creates an order
- Push to `develop` applies the migration
- Vercel Preview build succeeds

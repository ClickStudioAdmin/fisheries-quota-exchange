# Phase 8 — Auctions

## Purpose

Add English auctions with server-side bid logic. Bid time and close time come from the database, never from the browser.

A winning close creates a Phase 7 simulated order and reserves quota. There is no live payment.

Do not implement Stripe, seller payouts, or authority adapters in this phase.

## Flow

1. Organisation `OWNER` or `ADMIN` creates an auction from a holding (`starting` price, increment, optional reserve, start, end).
2. Status is `PENDING_APPROVAL`. Platform admin approves it (`PUBLISHED`) on `/admin/listings`.
3. A member of a different organisation places a bid. `place_bid` locks the listing, compares `now()` to start/end, and stores `bids.created_at` with `now()`.
4. A later bid must be at least the current price plus the increment.
5. After `expires_at`, a signed-in user closes the auction (automatic on the auction page, or the Close button). Close uses server time.
6. If the highest bid meets the reserve (or there is no reserve), `close_auction` creates an order, reserves quota, and sets the listing to `RESERVED`. Admin then runs the Phase 7 compliance / transfer / settlement steps.
7. If there is no qualifying bid, status becomes `UNSOLD` and the quantity is available again.

## Pages

| Path | Purpose |
| --- | --- |
| `/auctions` | Auction list |
| `/auctions/[id]` | Bid, history, close |
| `/organisations/[id]/auctions/new` | Create auction from a holding |
| `/admin/listings` | Approve auctions as well as fixed-price listings |

## Database

`listings.listing_type` may be `FIXED_PRICE` or `AUCTION`. Auction rows add starting price, increment, optional reserve, and `starts_at`. End time reuses `expires_at`.

`bids` stores each bid. `created_at` is always the database clock.

Functions:

- `create_auction`
- `place_bid`
- `close_auction`

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

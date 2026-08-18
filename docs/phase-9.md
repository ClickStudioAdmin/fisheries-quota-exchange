# Phase 9 — Stripe test payments

## Purpose

Take payments in **Stripe test mode** through Stripe Connect using **separate charges and transfers**. Buyers pay FQX (card or AU BECS bank debit when enabled). FQX holds the funds. At settlement, FQX Transfers the seller’s share to their connected account and keeps the platform fee. FQX is liable for refunds and chargebacks.

Do not implement live (non-test) keys, seller bank payouts, funds segregation, or a financial ledger in this phase. Admin still simulates the authority transfer. Settlement both completes quota and creates the Stripe Transfer.

Never trust the browser or the Checkout return URL for payment status. The webhook is the source of truth.

## Flow

1. Organisation `OWNER` or `ADMIN` opens **Payments** and completes Stripe Connect embedded onboarding (sandbox). FQX collects requirements and is liable for losses, so the form does not ask the seller to sign in to Stripe separately.
2. Stripe sends `account.updated`. The app stores whether the account can accept charges. Opening **Payments** also refreshes that flag from Stripe. The browser is not trusted for it.
3. A buyer purchases a published listing. `create_order` reserves quota. If the seller can accept charges, the order is `AWAITING_PAYMENT` and FQX shows an **embedded** Stripe Checkout on `/orders/[id]`. The full amount (quota + fee) is charged to the **FQX** Stripe account. There is no destination charge.
4. Stripe sends `checkout.session.completed` (cards) or `checkout.session.async_payment_succeeded` (bank debit). The app marks the order paid. Funds stay on the FQX balance. Refreshing the return URL does not charge again.
5. Expired Checkout or failed async payment cancels an unpaid order and releases the reservation. A declined card does not cancel the order; the buyer can pay again.
6. Admin runs compliance, then simulated authority transfer, then **Simulate settlement**. Settlement first Transfers `amount_aud` to the seller (`source_transaction` when a charge id exists), keeps `fee_amount_aud` on FQX, then completes quota and emails the dummy tax invoice.

If Stripe keys are missing, purchase stays on the Phase 7 path (`AWAITING_COMPLIANCE` immediately). No live payment.

Auction wins use the same rule: if the seller can accept charges, the order waits for payment.

When Stripe is configured, an organisation cannot create a listing or auction until `stripe_charges_enabled` is true.

Checkout asks Stripe for `card` and `au_becs_debit`. If that is rejected, it uses the payment methods enabled on the Stripe account, then cards only. Enable **AU BECS Direct Debit** for Checkout in the Stripe Dashboard (Settings → Payment methods) to offer bank debit. Stripe hides BECS when the charge is above the account debit limit (A$10,000 per transaction by default in test). Test BECS: BSB `000-000`, account `000123456`.

## Pages

| Path | Purpose |
| --- | --- |
| `/dashboard/payments` | Embedded Connect onboarding and account management |
| `/marketplace/[id]` | Purchase; Checkout when the seller is ready |
| `/orders/[id]` | Checkout (embedded) if `AWAITING_PAYMENT`; return URL is not authoritative |
| `/api/stripe/webhook` | Signed Stripe events |
| `/api/stripe/account-session` | Account Session client secret for embedded components |

## Database

Migrations: `supabase/migrations/20260818010000_stripe_test_payments.sql`, `20260818020000_replace_unready_stripe_account.sql`, `20260818030000_seller_settlement_transfer.sql`

- `organisations.stripe_account_id` and charge/payout flags
- `payments` (Checkout / PaymentIntent ids; `stripe_transfer_id` after settlement)
- `stripe_webhook_events` (event id primary key)

Functions:

- `organisation_accepts_card_payments`
- `attach_organisation_stripe_account`
- `sync_organisation_stripe_status` (service role)
- `upsert_order_payment` (buyer)
- `record_stripe_webhook_event` (service role)
- `mark_order_paid` (service role)
- `fail_unpaid_order` (service role)
- `attach_order_seller_transfer` (service role)

`insert_simulated_order` writes `AWAITING_PAYMENT` when the seller has `stripe_charges_enabled`. `cancel_order` also allows `AWAITING_PAYMENT`.

## Configuration

Server only (never `NEXT_PUBLIC_` except the publishable key):

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Test secret (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Test publishable key (`pk_test_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook and settlement transfer updates. Never expose to the browser. |

Point the Stripe sandbox webhook at `/api/stripe/webhook`:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `account.updated`

Turn **off automatic payouts** on the FQX platform Stripe account so held seller funds are not paid out to FQX’s bank before settlement.

Test card: `4242 4242 4242 4242`. Test BECS debit: BSB `000-000`, account `000123456`.

## Not in this phase

- Live Stripe keys or production charges
- Funds segregation (Stripe private preview)
- Seller bank payouts or available/pending balance UI
- Refund or chargeback workflows
- Authority transfer adapters
- Replacing simulated quota settlement

## Acceptance criteria

- Seller completes Connect onboarding in the sandbox
- Buyer pays a listing with a test card (and bank debit if BECS is enabled)
- Webhook marks the order paid; funds remain on FQX until Simulate settlement
- Simulate settlement Transfers the seller amount and keeps the fee
- Refreshing the return URL does not double-charge or double-advance
- Unpaid Checkout expiry cancels the order and releases quota
- Without Stripe keys, simulated purchase still works
- Push to `develop` applies the migrations
- Vercel Preview build succeeds

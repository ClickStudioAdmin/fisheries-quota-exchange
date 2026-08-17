# Phase 9 — Stripe test payments

## Purpose

Take card payments in **Stripe test mode** through Stripe Connect. Buyers pay FQX. Sellers onboard and receive transfers on the same charge. FQX is liable for refunds and chargebacks.

Do not implement live (non-test) keys, seller payouts, or a financial ledger in this phase. Admin still simulates transfer and settlement after payment.

Never trust the browser or the Checkout success URL for payment status. The webhook is the source of truth.

## Flow

1. Organisation `OWNER` or `ADMIN` opens **Payments** and completes Stripe Connect embedded onboarding (sandbox).
2. Stripe sends `account.updated`. The app stores whether the account can accept charges. The browser is not trusted for that flag.
3. A buyer purchases a published listing. `create_order` reserves quota. If the seller can accept charges, the order is `AWAITING_PAYMENT` and the buyer is sent to Stripe Checkout (destination charge, platform fee as `application_fee_amount`).
4. Stripe sends `checkout.session.completed`. The app marks the order paid, then records the event id so a retry after a failed write still applies. Refreshing the success URL does not charge again.
5. Expired Checkout cancels an unpaid order and releases the reservation. A declined card does not cancel the order; the buyer can pay again.
6. Admin then runs the existing compliance / transfer / settlement simulation. Settlement still emails the dummy tax invoice.

If Stripe keys are missing, purchase stays on the Phase 7 path (`AWAITING_COMPLIANCE` immediately). No live payment.

Auction wins use the same rule: if the seller can accept charges, the order waits for payment.

## Pages

| Path | Purpose |
| --- | --- |
| `/dashboard/payments` | Embedded Connect onboarding and account management |
| `/marketplace/[id]` | Purchase; Checkout when the seller is ready |
| `/orders/[id]` | Pay if `AWAITING_PAYMENT`; success URL is not authoritative |
| `/api/stripe/webhook` | Signed Stripe events |
| `/api/stripe/account-session` | Account Session client secret for embedded components |

## Database

Migration: `supabase/migrations/20260818010000_stripe_test_payments.sql`

- `organisations.stripe_account_id` and charge/payout flags
- `payments` (one row per order; Stripe Checkout / PaymentIntent ids)
- `stripe_webhook_events` (event id primary key)

Functions:

- `organisation_accepts_card_payments`
- `attach_organisation_stripe_account`
- `sync_organisation_stripe_status` (service role)
- `upsert_order_payment` (buyer)
- `record_stripe_webhook_event` (service role)
- `mark_order_paid` (service role)
- `fail_unpaid_order` (service role)

`insert_simulated_order` writes `AWAITING_PAYMENT` when the seller has `stripe_charges_enabled`. `cancel_order` also allows `AWAITING_PAYMENT`.

## Configuration

Server only (never `NEXT_PUBLIC_` except the publishable key):

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Test secret (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Test publishable key (`pk_test_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook updates only. Never expose to the browser. |

Point the Stripe sandbox webhook at `/api/stripe/webhook` (`checkout.session.completed`, `checkout.session.expired`, `account.updated`).

Test card: `4242 4242 4242 4242`.

## Not in this phase

- Live Stripe keys or production charges
- Seller payouts or available/pending balances
- Refund or chargeback workflows
- Authority transfer adapters
- Replacing simulated settlement

## Acceptance criteria

- Seller completes Connect onboarding in the sandbox
- Buyer pays a listing with a test card
- Webhook marks the order paid; refreshing the success URL does not double-charge or double-advance
- Unpaid Checkout expiry cancels the order and releases quota
- Without Stripe keys, simulated purchase still works
- Push to `develop` applies the migration
- Vercel Preview build succeeds

# Phase 9 — Stripe test payments

## Purpose

Take payments in **Stripe test mode** through Stripe Connect using **separate charges and transfers**. Buyers pay FQX the listed quota amount by AU BECS bank debit, or the listed amount **plus Stripe's domestic card processing fee** (`1.75% + A$0.30`, grossed up so the listed amount still reaches FQX) if they pay by card. Checkout creates a separate session for each method so the fee is only added on card. FQX holds the funds. At settlement, FQX Transfers the seller’s share (`amount_aud` minus `fee_amount_aud`) to their connected account and keeps the platform fee. The buyer does not pay the **platform** fee on top. FQX is liable for refunds and chargebacks.

Do not implement live (non-test) keys, seller bank payouts, funds segregation, or a financial ledger in this phase. Admin still simulates the authority transfer. Settlement both completes quota and creates the Stripe Transfer.

Never trust the browser or the Checkout return URL for payment status. The webhook is the source of truth.

## Flow

1. Organisation `OWNER` or `ADMIN` opens **Business Settings → Payments** and completes Stripe Connect embedded onboarding (sandbox). FQX collects requirements and is liable for losses, so the form does not ask the seller to sign in to Stripe separately.
2. Stripe sends `account.updated`. The app stores whether the account can accept charges. Opening Payments also refreshes that flag from Stripe. The browser is not trusted for it.
3. A buyer purchases a published listing. `create_order` reserves quota. If the seller can accept charges, the order is `AWAITING_PAYMENT` and FQX shows an **embedded** Stripe Checkout on `/orders/[id]`. The buyer chooses **bank debit** or **card** first. Bank debit charges the listed quota amount. Card charges the listed amount plus the Stripe card processing surcharge (Checkout line items: quota, then **Card processing (Stripe)**). Each method is a separate Checkout session. The charge sits on the **FQX** Stripe account. The platform fee is not added to the buyer charge. There is no destination charge. The order page totals show the listed amount and the card amount.
4. Stripe sends `checkout.session.completed` (cards) or `checkout.session.async_payment_succeeded` / `payment_intent.succeeded` (bank debit). The app marks the order paid. Funds stay on the FQX balance (often **Incoming** until they clear). Refreshing the return URL does not charge again. Opening the order page also reconciles payment status from Stripe. Pay FQX on `/orders/[id]` has three display states while the order is still the buyer’s: **Checkout** (embedded Stripe, only if a session can still be started), **Pending** (spinner while a debit is processing or payment is recorded but the order has not yet moved to `AWAITING_COMPLIANCE`), and **Paid** (checkout hidden once the order is `AWAITING_COMPLIANCE` or later). Pending polls the server about every five seconds while the tab is visible. The browser is still not trusted for payment status.
5. Expired Checkout or failed async payment cancels an unpaid order and releases the reservation. A declined card does not cancel the order; the buyer can pay again.
6. Admin runs compliance, then simulated authority transfer, then **Simulate settlement**. Settlement first Transfers `amount_aud` minus `fee_amount_aud` to the seller (`source_transaction` when a charge id exists), keeps `fee_amount_aud` on FQX, then completes quota and emails dummy tax invoice PDFs (quota: seller to buyer; fee: FQX to seller). Buyer and seller can download both from the order page after settlement.

If Stripe keys are missing, purchase stays on the Phase 7 path (`AWAITING_COMPLIANCE` immediately). No live payment.

Auction wins use the same rule: if the seller can accept charges, the order waits for payment.

When Stripe is configured, an organisation cannot create a listing or auction until `stripe_charges_enabled` is true.

Checkout asks Stripe for `au_becs_debit` or `card` depending on the method the buyer selected. Enable **AU BECS Direct Debit** for Checkout in the Stripe Dashboard (Settings → Payment methods) to offer bank debit. Bank debit is only offered when the listed amount is A$10,000 or less.

Card payments are **Australian-issued cards only**, so the domestic processing surcharge (`1.75% + A$0.30`) matches what Stripe actually takes. Checkout cannot hide foreign cards in the iframe; Stripe declines them after submit. Add this Radar rule in the **test-mode** Stripe Dashboard (Radar → Rules). Test and live rules are separate. Custom block rules need Radar for Fraud Teams if that add-on is required on the account:

```
Block if :card_country: != 'AU'
```

Test BECS: BSB `000-000`, account `000123456`. Test card (AU Visa): `4000 0003 6000 0006`. The generic `4242 4242 4242 4242` card is US-issued and must be declined.

## Pages

| Path | Purpose |
| --- | --- |
| `/how-it-works` | Buyer and seller steps from account through payment and settlement |
| `/privacy` | Privacy policy for this development site |
| `/terms` | Terms of service: buyers, sellers, and platform commission if a committed trade does not complete |
| `/dashboard` | Overview: onboarding, pending invitations to this person, holdings/listings/orders/alerts counts, latest 10 in-app notices |
| `/select-account` | Choose the active organisation after login, or when switching |
| `/invitations/[token]` | Accept or decline an account invitation. Signed in required; active organisation cookie is not |
| `/dashboard/profile` | Account Settings: Profile, Password and Security, Notifications (personal message switches), and Alerts (fishery watches) |
| `/dashboard/account` | Business Settings for the active business: Details, Members, Privileges, Payments, and Notifications (role routing and business message switches) |
| `/dashboard/notifications` | Signed-in user inbox |
| `/dashboard/alerts` | Redirects to `/dashboard/profile?tab=alerts` |
| `/dashboard/members` | Redirects to `/dashboard/account?tab=members` |
| `/dashboard/payments` | Redirects to `/dashboard/account?tab=payments` |
| `/marketplace/[id]` | Purchase; Checkout when the seller is ready |
| `/orders/[id]` | Pay FQX: Checkout (embedded) if `AWAITING_PAYMENT` and a session can start; Pending spinner while debit/payment is confirming; hidden after `AWAITING_COMPLIANCE`. After settlement, buyer and seller can download the quota and fee tax invoices. Return URL is not authoritative |
| `/orders/[id]/invoice/quota` | Quota tax invoice PDF (seller to buyer) after `COMPLETED`. Buyer, seller, or platform admin. Generated on request; not stored. `/orders/[id]/invoice` redirects here |
| `/orders/[id]/invoice/fee` | Platform fee tax invoice PDF (FQX to seller) after `COMPLETED`. Buyer, seller, or platform admin. Generated on request; not stored |
| `/api/stripe/webhook` | Signed Stripe events |
| `/api/stripe/account-session` | Account Session client secret for embedded components |
| `/api/cron/emails` | Scheduled mail (listing expired, auction ending soon, payment reminder). Requires `CRON_SECRET`. Hobby plans only allow once per day (`0 0 * * *` UTC). Hourly cron skips Git deploys on Hobby |

## Database

Migrations: `supabase/migrations/20260818010000_stripe_test_payments.sql`, `20260818020000_replace_unready_stripe_account.sql`, `20260818030000_seller_settlement_transfer.sql`, `20260818060000_seller_pays_platform_fee.sql`, `20260818100000_transactional_emails.sql`, `20260818110000_user_notifications_and_alerts.sql`, `20260818120000_in_app_notifications.sql`, `20260818130000_seed_admin_in_app_notifications.sql`, `20260819100000_terms_acceptances.sql`, `20260819110000_organisation_invitations.sql`, `20260819120000_organisation_notification_roles.sql`, `20260819130000_organisation_notification_preferences.sql`, `20260819140000_bid_created_by_email.sql`, `20260819150000_drop_bid_created_by_email.sql`, `20260819160000_buyer_owner_admin_only.sql`

`20260819140000` added `bids.created_by_email` and was applied on development. Deleting that file broke `supabase db push`. Keep it in git. `20260819150000` drops the column and restores `place_bid` so outbid mail stays organisation-based. `20260819160000` restricts `create_order`, `place_bid`, `upsert_order_payment`, and `cancel_order` to Owner and Admin of the buying business.

Development fixture `20260818130000_seed_admin_in_app_notifications.sql` inserts eight in-app notices for `click.studio.admin@gmail.com` when that membership exists (mix of read and unread). Links use real holdings, listings, and orders when they are present.

- `organisations.stripe_account_id` and charge/payout flags
- `payments` (Checkout / PaymentIntent ids; `stripe_transfer_id` after settlement)
- `stripe_webhook_events` (event id primary key)
- `terms_acceptances` (email + version; required before buy, bid, or list)
- `organisation_invitations` (pending invites; membership starts only after accept)
- `organisations.notification_roles` (which membership roles receive business email; default Owner and Admin)
- `organisations.disabled_notification_emails` and `disabled_notification_in_app` (business-level channel mutes)

Every signed-in user must agree to the current terms on Overview and add business details on Business Settings before they can purchase, bid, or create a listing or auction. Creating a listing or auction also requires ticking the seller acknowledgements. Purchase shows the buyer acknowledgements as a confirmation step after Purchase Now; bid requires ticking them on the auction page. The server checks those boxes; the browser is not trusted. Registration is personal details only. The server records the terms version and organisation membership. If a party does not complete a trade they have already entered, the terms may make them liable to pay the platform commission. This phase does not auto-invoice that abort commission.

Buy, bid, list, holdings, members, and payments use the active organisation from the session cookie. The browser is not trusted to choose a different organisation on the listing. Buy, bid, pay, and cancel unpaid orders are Owner and Admin only, same as listing. Members can view. Owners and admins invite people from Business Settings → Members. The invitee must accept from the email (or Overview) while signed in as that address. They are not added automatically. Business Settings → Privileges shows what each role can do. Roles are fixed.

Functions:

- `organisation_accepts_card_payments`
- `attach_organisation_stripe_account`
- `sync_organisation_stripe_status` (service role)
- `upsert_order_payment` (buyer)
- `record_stripe_webhook_event` (service role)
- `mark_order_paid` (service role)
- `fail_unpaid_order` (service role)
- `attach_order_seller_transfer` (service role)
- `accept_terms`
- `invite_organisation_member`
- `get_organisation_invitation`
- `accept_organisation_invitation`
- `decline_organisation_invitation`
- `cancel_organisation_invitation`

`insert_simulated_order` writes `AWAITING_PAYMENT` when the seller has `stripe_charges_enabled`. `cancel_order` also allows `AWAITING_PAYMENT`.

## Configuration

Server only (never `NEXT_PUBLIC_` except the publishable key):

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Test secret (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Test publishable key (`pk_test_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook, settlement transfer updates, and scheduled email. Never expose to the browser. |
| `CRON_SECRET` | Bearer token for `/api/cron/emails`. Vercel Cron sends it automatically when set. |

Point the Stripe sandbox webhook at `/api/stripe/webhook`:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `account.updated`

Opening an unpaid order also checks the Checkout Session with Stripe. If the debit has already succeeded (including when the Dashboard shows Incoming), FQX marks the order paid even if a webhook was missed.

Turn **off automatic payouts** on the FQX platform Stripe account so held seller funds are not paid out to FQX’s bank before settlement.

In the test-mode Dashboard, add Radar rule `Block if :card_country: != 'AU'` so international cards cannot underfund the listed amount after Stripe’s 3.5% fee. Repeat the rule in live mode in a later phase.

Test card (AU Visa): `4000 0003 6000 0006`. Test BECS debit: BSB `000-000`, account `000123456`. Do not use `4242 4242 4242 4242` once the Radar rule is on.

## Transactional email

Mail is sent from the server after the database write. Auth confirm and password reset stay on Supabase Auth. Missing `RESEND_API_KEY` or `EMAIL_FROM` skips sending; the action still succeeds. The same events also write an in-app notice. Platform admins can disable each product **email** on `/admin/settings`. Previews are on `/admin/templates`.

Business mail (listings, holdings, selling, buying, bidding, payments, and settlement for that organisation) goes to the roles chosen on Business Settings → Notifications. Default is Owner and Admin. The role picker is hidden when the organisation has one member. If the chosen roles have no members, owners are used. Email and in-app switches for those business messages are stored on the organisation (`disabled_notification_emails`, `disabled_notification_in_app`). They do not follow the signed-in person when they switch business.

Account Settings → Notifications is this login. Membership and listing-alert channels stay there only. Bid, purchase, payment, and settlement mail goes to Business Settings → Notifications for that organisation’s roles. Payment and settlement also go to the other party’s business roles. `bid_outbid` and `auction_not_won` go to the bidding business’s roles. Checkout expiry, failed bank debit, and rejected compliance email both the buying and selling businesses.

Both lists group related messages. Sent to is You on Account Settings and Business roles on Business Settings.

Buyer and seller both receive `order_settled` with both dummy tax invoice PDFs. The buyer copy goes to the buying business’s notification roles. The seller copy goes to the selling business’s notification roles.

Users switch sale and/or lease per fishery on Account Settings → Alerts. When a listing or auction is published, matching subscribers receive `listing_alert`. The seller’s organisation is not emailed that alert.

One-shot mail uses `email_dispatches` via `claim_email_dispatch` so payment, checkout, failed debit, rejected compliance, listing expiry, auction ending soon, payment reminder, and payments-setup messages are not resent.

Scheduled cron (`vercel.json` → `/api/cron/emails`, once a day at 00:00 UTC) sends:

- `listing_expired` for published fixed-price listings past `expires_at`
- `auction_ending_soon` for published auctions ending within 24 hours
- `payment_reminder` for orders still `AWAITING_PAYMENT` after 24 hours

Hobby accounts cannot use hourly Vercel Cron. An hourly expression (`0 * * * *`) is rejected and **Git pushes do not create a deployment** (no failed build appears). Keep the daily schedule unless the Vercel project is on Pro.

Holding “request changes” emails the seller and leaves the holding `PENDING_VERIFICATION` (there is no rejected holding status).

Do not put Resend keys or `CRON_SECRET` in `NEXT_PUBLIC_` variables.

## Not in this phase

- Live Stripe keys or production charges
- Funds segregation (Stripe private preview)
- Seller bank payouts or available/pending balance UI
- Refund or chargeback workflows
- Automated invoicing when a party does not complete a committed trade (the obligation is in the terms)
- Authority transfer adapters
- Replacing simulated quota settlement

## Acceptance criteria

- Seller completes Connect onboarding in the sandbox
- Buyer pays a listing with an Australian-issued test card (and bank debit if BECS is enabled), including the Stripe card processing line; a non-AU card is declined
- Webhook marks the order paid; funds remain on FQX until Simulate settlement
- Simulate settlement Transfers the seller net (listed amount minus fee) and keeps the fee
- Refreshing the return URL does not double-charge or double-advance
- Unpaid Checkout expiry cancels the order and releases quota
- Without Stripe keys, simulated purchase still works
- Push to `develop` applies the migrations
- Vercel Preview build succeeds

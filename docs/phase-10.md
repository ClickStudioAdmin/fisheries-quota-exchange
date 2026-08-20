# Phase 10 — Queensland transfer process (foundation)

## Status

In progress. Work only on this phase until acceptance criteria pass.

## Purpose

Add a **jurisdiction-specific transfer layer**. Queensland sales and leases get an application PDF generated from stored business data, admin review, and tracked Fisheries Queensland submission. Other jurisdictions keep today’s simulated transfer.

Do not rebuild checkout, payment, buyer eligibility, quota reservation, or settlement. Do not add live e-sign, a Fisheries Queensland portal/API, live Stripe keys, seller bank payouts, or other jurisdictions’ real processes.

Never trust the browser for payment status, bid time, quota availability, or transfer outcome. Never delete quota ledger rows.

## Flow

1. Payment stays as it is. Compliance review shows the order, buyer and seller business details, and a checklist of jurisdiction steps (Queensland instructions on QLD orders). Admins tick steps and save progress. Each newly saved check writes an audit event. Approve stays disabled until every required check is saved; the browser is not trusted. Approving then moves the order to `AWAITING_TRANSFER` and writes the existing compliance-approved audit event. **Request update** keeps the order in `AWAITING_COMPLIANCE` and emails only the ticked parties, each with their own message. **Reject** still cancels the order and emails both parties.
2. FQX resolves the process from the listing holding’s fishery jurisdiction plus offering (`SALE` or `LEASE`). Queensland uses `QLD_SALE` (FDU1465) or `QLD_LEASE` (FDU1469). Everything else uses `SIMULATED`.
3. A `transfer_applications` row holds **child** status. It does not replace `orders.status`.
4. Shared transfer fields live on the business (entity kind, ACN for companies, phone, structured Australian addresses). Queensland-only fields live on `organisation_jurisdiction_profiles`. Owners and admins select jurisdictions on **Business Settings → Details**; Queensland fields appear when Queensland is selected. There is no second onboarding form.
5. Buying, bidding, and listing require complete identity fields (entity kind, legal name, ABN, ACN for companies, phone, registered address; postal address if it differs). Queensland client number and primary licence are required only for Queensland trades, which also requires Queensland to be selected. The browser is not trusted: server actions check the signed-in business and call `organisation_is_trade_ready` for the other party. Incomplete details block the form and name the missing fields.
6. If required transfer-application fields are missing, FQX does not generate a PDF. The order page lists what is missing and links this business to Details.
7. When both businesses are complete, FQX generates an unsigned PDF from stored data, stores it, and emails it to the **seller** only. The seller downloads that file from the order (or the email), signs and witnesses **offline**, and uploads it. The buyer does not receive the unsigned PDF.
8. Admin checks the seller-signed form (saveable checklist; the browser is not trusted). Until that check is saved and accepted, the buyer cannot download it. Admin can still upload a seller-signed file or a completed pack for offline processing. Previous files are not overwritten.
9. After accept, FQX emails the buyer the seller-signed PDF. The buyer signs that file, uploads the completed pack, and admin reviews it, then records Fisheries Queensland submission. There is no FQ API.
10. On **approved**, FQX calls the existing `simulate_transfer` so the order becomes `AWAITING_SETTLEMENT`. Settlement still moves the quota ledger and creates the Stripe Transfer. Do not apply quota again at FQ approval.

Non-Queensland orders still show **Simulate transfer**.

## Signing (this phase)

No live e-sign vendor. FDU1465 witnessing is a legal requirement; a checkbox is not a witness.

1. Generate unsigned PDF and email the seller.
2. Seller downloads it, signs and witnesses offline, and uploads it (or returns it to FQX for admin upload).
3. Admin checks the seller-signed form. Approve stays disabled until every required seller-pack check is saved.
4. Buyer receives that file, signs and witnesses, and uploads the completed pack (or admin uploads it).
5. Admin reviews the completed pack, then records FQ submission.

Embedded e-sign is a later phase, after a provider is chosen and checked against witnessing rules.

## Forms

PDF layout for Queensland **sales** fills official FDU1465 (`lib/transfers/forms/fdu1465-v09-23.pdf`). Queensland **leases** fill official FDU1469 (`lib/transfers/forms/fdu1469-v02-26.pdf`). Both are pre-filled from stored business and order data and stored in a private bucket. Pre-filled party and quota fields are read-only. Signature, witness, date of birth, licence-transfer, quota-year, and fee-payment fields stay blank and editable for offline completion. Dummy tax invoices stay on `@react-pdf/renderer`.

| Offering | Form type | Version | Notes |
| --- | --- | --- | --- |
| Sale | `FDU1465` | `V09/23` | Official Register transfer of quota or effort unit application. FQX pre-fills and locks party and quota fields; parties sign and witness offline. |
| Lease | `FDU1469` | `V02/26` | Official Register temporary transfer of quota or effort unit application. FQX pre-fills and locks party and unused-unit fields; parties sign and witness offline. |

Child statuses (QLD only): `READY` → `AWAITING_SELLER_SIGNATURE` (after generate) → `AWAITING_SELLER_PACK_REVIEW` (after seller upload) → `AWAITING_BUYER_SIGNATURE` (after admin accept) → `ADMIN_REVIEW` (after completed pack) → `SUBMITTED` → `PROCESSING` → `APPROVED` or `ACTION_REQUIRED`. Returning the seller form goes back to `AWAITING_SELLER_SIGNATURE`. Corrections regenerate a new unsigned PDF; previous files stay stored but are hidden from the current document list. Uploaded files are named `FQX-order-{id}-{form}-{kind}-v{n}.pdf`. Public nested captions are **1 of 6** through **6 of 6**.

## Pages

| Path | Purpose |
| --- | --- |
| `/dashboard` | Overview Inbox plus Needs attention: pay (not cancelled, rejected, completed, or expired/failed payment), compliance update requests, QLD seller prepare/sign/upload, QLD buyer sign/upload after FQX releases the seller-signed form, and ended auctions to close. Cancelling an order, checkout expiry, and transfer steps refresh this list. The same party actions number Overview, Orders, and Listings, and the header Dashboard badge |
| `/dashboard/account` | Business Details includes entity, ACN (companies), phone, structured Australian addresses, a jurisdiction multi-select (Queensland selectable now), and Queensland Fisheries fields when Queensland is selected |
| `/orders/[id]` | During `AWAITING_PAYMENT`, the buyer who can pay sees Checkout or Pending. The seller sees Waiting for payment (or Payment pending if a debit is in flight). During `AWAITING_COMPLIANCE`: payment-received notice. Status bar is quota, payment, compliance, transfer, then settlement. Queensland transfer uses a nested 1 of 6 caption on the badge, Transfer step, and Queensland transfer panel. Action required stays unnumbered. Request-update notes open from View Message. During `AWAITING_TRANSFER` on a QLD order: seller downloads/uploads first; buyer downloads the seller-signed file only after admin accept, then uploads the completed pack. After compliance approval, seller mail says to sign first; buyer mail says to wait. During `AWAITING_SETTLEMENT`: a Settlement card (FQ approved or transfer recorded; FQX settling quota then seller net then dummy invoices; no party action). Queensland orders can still download the signed application. After settlement, the order page lists the signed application (when stored). The buyer sees the dummy quota invoice (their payment); the seller sees the dummy fee invoice. `order_settled` mail and in-app copy follow the same split |
| `/orders/[id]/transfer/[documentId]` | Auth-checked download of a stored transfer PDF. The buyer cannot download the unsigned application or the seller-signed file until admin accepts |
| `/admin/orders` | Compliance review shows order, buyer and seller details, and a saveable checklist of jurisdiction steps. Approve stays disabled until every required check is saved. Request update emails only the selected buyer and/or seller; the order stays open. Cancel is admin-only (awaiting payment or compliance). QLD rows use Open transfer (workspace: generate, seller-pack review, upload seller-signed or completed pack, record FQ). Simulated rows use Simulate transfer |
| `/admin/holdings` | Holding verification review shows holding, business details, recent ledger, and a saveable checklist. Queensland holdings add client-number and licence checks. Verify stays disabled until every required check is saved; each saved check and the final verify write audit events |
| `/admin/listings` | Listing approval review shows listing, seller, covering holding, and a saveable checklist. Auctions add start/reserve/increment checks. Queensland listings add client-number and licence checks. Approve stays disabled until every required check is saved; each saved check and the final publish write audit events |

## Database

Migration: `supabase/migrations/20260820010000_qld_transfer_process.sql`, `20260820020000_organisation_structured_address.sql`, `20260820030000_admin_cancel_order.sql`, `20260820040000_organisation_trade_ready.sql`, `20260820050000_order_compliance_checklist.sql`, `20260820060000_holding_verification_checklist.sql`, `20260820070000_listing_approval_checklist.sql`, `20260820080000_organisation_enabled_jurisdictions.sql`, `20260820090000_review_checklist_audit.sql`, `20260820100000_request_compliance_update.sql`, `20260820130000_sequential_transfer_signing.sql`, `20260820140000_order_settled_notice_invoice_copy.sql`

- `organisations`: `entity_kind`, `acn`, `mobile`, structured `registered_address` / `postal_address` (street, suburb, state, postcode), `postal_same_as_registered`, `enabled_jurisdiction_codes` (Queensland is the only selectable code in this phase)
- `organisation_jurisdiction_profiles`: per business and jurisdiction (QLD client number, commercial fishing licence, symbols)
- `organisation_is_trade_ready`: security-definer boolean for buy/list gating (identity plus QLD licence pair when the fishery is Queensland). Does not return field values.
- `orders.compliance_checklist`: jsonb array of completed compliance-check labels. Platform admins save it during `AWAITING_COMPLIANCE`. Approve compliance requires every required check to be saved. Each newly saved check writes `COMPLIANCE_CHECK_COMPLETED`. Request update (`request_compliance_update`) does not change status or release the reservation; it writes `COMPLIANCE_UPDATE_REQUESTED_BUYER` and/or `COMPLIANCE_UPDATE_REQUESTED_SELLER` scoped to that organisation only. It is not a legal sign-off.
- `quota_holdings.verification_checklist`: jsonb array of completed verification-check labels. Platform admins save it during `PENDING_VERIFICATION`. Verify requires every required check to be saved. Each newly saved check writes `HOLDING_CHECK_COMPLETED`. It is not a legal sign-off.
- `listings.approval_checklist`: jsonb array of completed approval-check labels. Platform admins save it during `PENDING_APPROVAL`. Approve requires every required check to be saved. Each newly saved check writes `LISTING_CHECK_COMPLETED`. It is not a legal sign-off.
- `transfer_applications`: one per order; process code; child status; FQ submission fields; `seller_pack_checklist` during seller-signed review
- `transfer_documents`: `UNSIGNED_APPLICATION`, `SELLER_SIGNED`, `SIGNED_PACK`, `SUPPORTING`; storage path; never mutated. Display lists only files from the current unsigned application. Stored names use `FQX-order-{id}-{form}-{kind}-v{n}.pdf`.
- Private storage bucket `transfer-documents`. Buyer storage/download of the seller-signed file is blocked until status is `AWAITING_BUYER_SIGNATURE` or later. Party uploads go through `record_party_transfer_upload`.

## Acceptance criteria

1. A Queensland sale order in `AWAITING_TRANSFER` does not show Simulate transfer. Admin sees a transfer workspace.
2. A non-Queensland order still shows Simulate transfer.
3. Incomplete buyer or seller details block PDF generation and name the missing fields.
4. A generated PDF is stored, emailed to the seller, and downloadable by the seller and admin. The buyer cannot download it.
5. Seller (or admin) can upload a seller-signed PDF without overwriting the unsigned file. Admin must save seller-pack checks before releasing it to the buyer. Saving progress stays in the transfer workspace. Admin can save and release in one step.
6. After release, the buyer (or admin) can upload the completed pack. Recording FQ approved calls existing `simulate_transfer`. Quota ledger quantity does not change until Simulate settlement.
7. Lint and production build pass. Tests cover process routing, required-field gating, and buy/list completeness.

## What this phase will not do

- Checkout, payment, buyer eligibility, quota cover checks
- Live e-sign, live FQ portal/API, other jurisdictions’ real processes
- A second quota ledger, seller bank payouts beyond today’s settlement Transfer, refunds, or live Stripe keys

# Phase 10 — Queensland transfer process (foundation)

## Status

In progress. Work only on this phase until acceptance criteria pass.

## Purpose

Add a **jurisdiction-specific transfer layer**. Queensland sales and leases get an application PDF generated from stored business data, admin review, and tracked Fisheries Queensland submission. Other jurisdictions keep today’s simulated transfer.

Do not rebuild checkout, payment, buyer eligibility, quota reservation, or settlement. Do not add live e-sign, a Fisheries Queensland portal/API, live Stripe keys, seller bank payouts, or other jurisdictions’ real processes.

Never trust the browser for payment status, bid time, quota availability, or transfer outcome. Never delete quota ledger rows.

## Flow

1. Payment stays as it is. Compliance review shows the order, buyer and seller business details, and a checklist of jurisdiction steps (Queensland instructions on QLD orders). Admins tick steps and save progress. Each newly saved check writes an audit event. Approve stays disabled until every required check is saved; the browser is not trusted. Approving then moves the order to `AWAITING_TRANSFER` and writes the existing compliance-approved audit event. **Request update** keeps the order in `AWAITING_COMPLIANCE` and emails only the ticked parties, each with their own message. **Reject** still cancels the order and emails both parties.
2. FQX resolves the process from the listing holding’s fishery jurisdiction plus offering (`SALE` or `LEASE`). Queensland uses `QLD_SALE` (FDU1465) or `QLD_LEASE`. Everything else uses `SIMULATED`.
3. A `transfer_applications` row holds **child** status. It does not replace `orders.status`.
4. Shared transfer fields live on the business (entity kind, ACN for companies, phone, structured Australian addresses). Queensland-only fields live on `organisation_jurisdiction_profiles`. Owners and admins select jurisdictions on **Business Settings → Details**; Queensland fields appear when Queensland is selected. There is no second onboarding form.
5. Buying, bidding, and listing require complete identity fields (entity kind, legal name, ABN, ACN for companies, phone, registered address; postal address if it differs). Queensland client number and primary licence are required only for Queensland trades, which also requires Queensland to be selected. The browser is not trusted: server actions check the signed-in business and call `organisation_is_trade_ready` for the other party. Incomplete details block the form and name the missing fields.
6. If required transfer-application fields are missing, FQX does not generate a PDF. The order page lists what is missing and links this business to Details.
7. When both businesses are complete, FQX generates an unsigned PDF from stored data, stores it, and emails it to buyer and seller notification roles. Parties download the same file from the order. They sign and witness **offline**.
8. There is no party upload UI. Admin uploads the completed/signed PDF as a new document version. The unsigned original is not overwritten.
9. Admin records Fisheries Queensland submission (method, date, reference, notes) and later processing / action required / approved. There is no FQ API.
10. On **approved**, FQX calls the existing `simulate_transfer` so the order becomes `AWAITING_SETTLEMENT`. Settlement still moves the quota ledger and creates the Stripe Transfer. Do not apply quota again at FQ approval.

Non-Queensland orders still show **Simulate transfer**.

## Signing (this phase)

No live e-sign vendor. FDU1465 witnessing is a legal requirement; a checkbox is not a witness.

1. Generate unsigned PDF.
2. Parties download it and receive it by email (`email_dispatches` so refresh does not re-send).
3. Sign and witness offline.
4. Admin uploads the completed pack.
5. Admin reviews, then records FQ submission.

Embedded e-sign is a later phase, after a provider is chosen and checked against witnessing rules.

## Forms

PDF layout is generated in-app (`@react-pdf/renderer`), same family as tax invoices, and **stored** in a private bucket. Official FDU1465 / lease field lists from Fisheries Queensland can replace the layout later without changing the data model.

| Offering | Form type | Version | Notes |
| --- | --- | --- | --- |
| Sale | `FDU1465` | `V02/26` | Permanent transfer of quota and/or effort units. Layout pending official PDF mapping. |
| Lease | `FDU_LEASE` | `V01/26` | Queensland lease / temporary transfer. Official form code pending. |

Child statuses (QLD only): `READY` → `AWAITING_SIGNED_PACK` (after generate) → `ADMIN_REVIEW` (after signed pack) → `SUBMITTED` → `PROCESSING` → `APPROVED` or `ACTION_REQUIRED`. Corrections regenerate a new unsigned PDF; previous files stay.

## Pages

| Path | Purpose |
| --- | --- |
| `/dashboard/account` | Business Details includes entity, ACN (companies), phone, structured Australian addresses, a jurisdiction multi-select (Queensland selectable now), and Queensland Fisheries fields when Queensland is selected |
| `/orders/[id]` | During `AWAITING_TRANSFER` on a QLD order: status, missing fields, prepare/download unsigned PDF |
| `/orders/[id]/transfer/[documentId]` | Auth-checked download of a stored transfer PDF |
| `/admin/orders` | Compliance review shows order, buyer and seller details, and a saveable checklist of jurisdiction steps. Approve stays disabled until every required check is saved. Request update emails only the selected buyer and/or seller; the order stays open. Cancel is admin-only (awaiting payment or compliance). QLD transfer workspace instead of Simulate transfer: generate, upload signed pack, record FQ outcome |
| `/admin/holdings` | Holding verification review shows holding, business details, recent ledger, and a saveable checklist. Queensland holdings add client-number and licence checks. Verify stays disabled until every required check is saved; each saved check and the final verify write audit events |
| `/admin/listings` | Listing approval review shows listing, seller, covering holding, and a saveable checklist. Auctions add start/reserve/increment checks. Queensland listings add client-number and licence checks. Approve stays disabled until every required check is saved; each saved check and the final publish write audit events |

## Database

Migration: `supabase/migrations/20260820010000_qld_transfer_process.sql`, `20260820020000_organisation_structured_address.sql`, `20260820030000_admin_cancel_order.sql`, `20260820040000_organisation_trade_ready.sql`, `20260820050000_order_compliance_checklist.sql`, `20260820060000_holding_verification_checklist.sql`, `20260820070000_listing_approval_checklist.sql`, `20260820080000_organisation_enabled_jurisdictions.sql`, `20260820090000_review_checklist_audit.sql`, `20260820100000_request_compliance_update.sql`

- `organisations`: `entity_kind`, `acn`, `mobile`, structured `registered_address` / `postal_address` (street, suburb, state, postcode), `postal_same_as_registered`, `enabled_jurisdiction_codes` (Queensland is the only selectable code in this phase)
- `organisation_jurisdiction_profiles`: per business and jurisdiction (QLD client number, commercial fishing licence, symbols)
- `organisation_is_trade_ready`: security-definer boolean for buy/list gating (identity plus QLD licence pair when the fishery is Queensland). Does not return field values.
- `orders.compliance_checklist`: jsonb array of completed compliance-check labels. Platform admins save it during `AWAITING_COMPLIANCE`. Approve compliance requires every required check to be saved. Each newly saved check writes `COMPLIANCE_CHECK_COMPLETED`. Request update (`request_compliance_update`) does not change status or release the reservation; it writes `COMPLIANCE_UPDATE_REQUESTED_BUYER` and/or `COMPLIANCE_UPDATE_REQUESTED_SELLER` scoped to that organisation only. It is not a legal sign-off.
- `quota_holdings.verification_checklist`: jsonb array of completed verification-check labels. Platform admins save it during `PENDING_VERIFICATION`. Verify requires every required check to be saved. Each newly saved check writes `HOLDING_CHECK_COMPLETED`. It is not a legal sign-off.
- `listings.approval_checklist`: jsonb array of completed approval-check labels. Platform admins save it during `PENDING_APPROVAL`. Approve requires every required check to be saved. Each newly saved check writes `LISTING_CHECK_COMPLETED`. It is not a legal sign-off.
- `transfer_applications`: one per order; process code; child status; FQ submission fields
- `transfer_documents`: `UNSIGNED_APPLICATION`, `SIGNED_PACK`, `SUPPORTING`; storage path; never mutated
- Private storage bucket `transfer-documents`

## Acceptance criteria

1. A Queensland sale order in `AWAITING_TRANSFER` does not show Simulate transfer. Admin sees a transfer workspace.
2. A non-Queensland order still shows Simulate transfer.
3. Incomplete buyer or seller details block PDF generation and name the missing fields.
4. A generated PDF is stored, downloadable by buyer, seller, and admin, and emailed once per document version.
5. Admin can upload a signed pack without overwriting the unsigned file.
6. Recording FQ approved calls existing `simulate_transfer`. Quota ledger quantity does not change until Simulate settlement.
7. Lint and production build pass. Tests cover process routing, required-field gating, and buy/list completeness.

## What this phase will not do

- Checkout, payment, buyer eligibility, quota cover checks
- Live e-sign, live FQ portal/API, other jurisdictions’ real processes
- Party upload of signed PDFs
- A second quota ledger, seller bank payouts beyond today’s settlement Transfer, refunds, or live Stripe keys

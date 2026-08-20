# Phase 10 — Queensland transfer process (foundation)

## Status

In progress. Work only on this phase until acceptance criteria pass.

## Purpose

Add a **jurisdiction-specific transfer layer**. Queensland sales and leases get an application PDF generated from stored business data, admin review, and tracked Fisheries Queensland submission. Other jurisdictions keep today’s simulated transfer.

Do not rebuild checkout, payment, buyer eligibility, quota reservation, or settlement. Do not add live e-sign, a Fisheries Queensland portal/API, live Stripe keys, seller bank payouts, or other jurisdictions’ real processes.

Never trust the browser for payment status, bid time, quota availability, or transfer outcome. Never delete quota ledger rows.

## Flow

1. Payment stays as it is. Compliance review shows the order, buyer and seller business details, and jurisdiction checks (Queensland instructions on QLD orders). Approving still moves the order to `AWAITING_TRANSFER`.
2. FQX resolves the process from the listing holding’s fishery jurisdiction plus offering (`SALE` or `LEASE`). Queensland uses `QLD_SALE` (FDU1465) or `QLD_LEASE`. Everything else uses `SIMULATED`.
3. A `transfer_applications` row holds **child** status. It does not replace `orders.status`.
4. Shared transfer fields live on the business (entity kind, ACN for companies, phone, structured Australian addresses). Queensland-only fields live on `organisation_jurisdiction_profiles`. Owners and admins edit them on **Business Settings → Details**. There is no second onboarding form.
5. If required fields are missing, FQX does not generate a PDF. The order page lists what is missing and links this business to Details.
6. When both businesses are complete, FQX generates an unsigned PDF from stored data, stores it, and emails it to buyer and seller notification roles. Parties download the same file from the order. They sign and witness **offline**.
7. There is no party upload UI. Admin uploads the completed/signed PDF as a new document version. The unsigned original is not overwritten.
8. Admin records Fisheries Queensland submission (method, date, reference, notes) and later processing / action required / approved. There is no FQ API.
9. On **approved**, FQX calls the existing `simulate_transfer` so the order becomes `AWAITING_SETTLEMENT`. Settlement still moves the quota ledger and creates the Stripe Transfer. Do not apply quota again at FQ approval.

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
| `/dashboard/account` | Business Details includes entity, ACN (companies), phone, structured Australian addresses, and Queensland Fisheries fields |
| `/orders/[id]` | During `AWAITING_TRANSFER` on a QLD order: status, missing fields, prepare/download unsigned PDF |
| `/orders/[id]/transfer/[documentId]` | Auth-checked download of a stored transfer PDF |
| `/admin/orders` | Compliance review shows order, buyer and seller details, and Queensland checks. Cancel is admin-only (awaiting payment or compliance). QLD transfer workspace instead of Simulate transfer: generate, upload signed pack, record FQ outcome |

## Database

Migration: `supabase/migrations/20260820010000_qld_transfer_process.sql`, `20260820020000_organisation_structured_address.sql`, `20260820030000_admin_cancel_order.sql`

- `organisations`: `entity_kind`, `acn`, `mobile`, structured `registered_address` / `postal_address` (street, suburb, state, postcode), `postal_same_as_registered`
- `organisation_jurisdiction_profiles`: per business and jurisdiction (QLD client number, commercial fishing licence, symbols)
- `transfer_form_templates`: versioned form metadata
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
7. Lint and production build pass. Tests cover process routing and required-field gating.

## What this phase will not do

- Checkout, payment, buyer eligibility, quota cover checks
- Live e-sign, live FQ portal/API, other jurisdictions’ real processes
- Party upload of signed PDFs
- A second quota ledger, seller bank payouts beyond today’s settlement Transfer, refunds, or live Stripe keys

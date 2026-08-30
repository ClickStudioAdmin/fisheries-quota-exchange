# Phase 11 — Queensland online signing (PandaDoc)

## Status

Complete for **sales**. Live Queensland **leases** moved to Phase 12 custodial FishNet (FDU1469 / lease PandaDoc retired from live paths). Sale offline pack and sale PandaDoc remain as built in this phase.

## Purpose

Add **online digital signing** for Queensland sale and lease transfer applications, using **PandaDoc**, as a **second, fully separate signing flow**.

The Phase 10 **offline pack** flow must keep working exactly as it does today: generate unsigned PDF, seller signs and witnesses offline, seller uploads, admin seller-pack review, buyer signs and witnesses offline, buyer uploads completed pack, admin reviews, then Fisheries Queensland tracking and `simulate_transfer`. Do not rewrite, merge, or replace that path.

This phase adds an alternate path whose two product differences from the offline pack are: parties **Sign Online** in FQX, and **buyer and seller sign in parallel** so transfer time is not gated on seller-first then buyer. FQX still generates the official PDF and uploads it to PandaDoc. Each party clicks **Sign Online**, signs with their witness present, and PandaDoc tells FQX when that recipient (and later the whole document) is complete. After a completed sealed PDF is stored, both flows use the same Fisheries Queensland submission and settlement handoff.

Never trust the browser, a PandaDoc iframe event, or a “Sign Online” return URL for signature or transfer outcome. The signed PandaDoc webhook (with order-page reconcile as fallback) is the source of truth. Never delete quota ledger rows.

## Decisions (locked for this phase)

### Two flows, one jurisdiction process

Queensland still resolves to `QLD_SALE` (FDU1465) or `QLD_LEASE` (FDU1469). Simulated jurisdictions stay `SIMULATED`.

The split is a **signing channel**, not a new process code:

| Channel | Meaning |
| --- | --- |
| `OFFLINE` | Phase 10 pack: download, wet-ink / Adobe, upload. Unchanged. |
| `PANDADOC` | This phase: FQX PDF uploaded to PandaDoc; **Sign Online**; buyer and seller sign in parallel. |

Shared after a completed application PDF exists: admin completed-pack review (online stores the sealed PandaDoc PDF as that pack), FQ submission fields, `APPROVED` → existing `simulate_transfer`, settlement. Quota still does not move at FQ approval.

Do not mix controls. An `OFFLINE` order never shows **Sign Online**. A `PANDADOC` order never shows party download/upload of unsigned or seller-signed files for signing. Admin can still download stored PDFs on both channels.

### Default and per-order choice

1. Platform admins set the **default Queensland signing channel** on `/admin/settings` (`platform_settings.qld_default_signing_channel`). Default value is `OFFLINE` so current behaviour stays until someone changes it.
2. During `AWAITING_COMPLIANCE` on a Queensland order, a **required compliance control** on the Decision section chooses the channel for that order: Offline pack or Sign online (PandaDoc). The control is pre-filled from the platform default. Saving the signing method stores the choice. Approve is disabled until this control is saved along with the other required checks. The browser is not trusted.
3. Approving compliance copies the saved channel onto `transfer_applications.signing_channel` and must not change it afterwards.
4. The channel cannot be changed after the transfer application leaves `READY` (unsigned PDF generated, or PandaDoc document created). Switch before generate only, by keeping the order in `AWAITING_COMPLIANCE` (request update / do not approve yet) or by regenerating from `READY` has not started — once generate has run, stay on that channel.
5. If PandaDoc API keys are missing, the platform default can still be `OFFLINE`. Selecting `PANDADOC` on an order or as the default is refused with a clear error until keys exist.

Non-Queensland orders have no signing-channel control.

### PDF vs PandaDoc data

FQX remains the source of the official form content.

1. Generate the same unsigned FDU1465 / FDU1469 PDF from stored business and order data (Phase 10 generator). Store it as `UNSIGNED_APPLICATION`.
2. For `PANDADOC`, upload **that PDF file** to PandaDoc (`POST /public/v1/documents` as `multipart/form-data`). Do not send a public URL (the transfer bucket is private). Do not rebuild the FDU as PandaDoc tokens; that would duplicate fill logic and drift from the official form.
3. Signature, date, printed-name, and witness blocks stay blank in the FQX fill, as today. For `PANDADOC`, FQX flattens that filled PDF, then embeds only the needed native signature/text widgets on the official declaration boxes and uploads with `parse_form_fields: true` so PandaDoc places fields from the PDF itself. Do not use Create Document Fields coordinates for placement (they drifted from the form). Offline generation does not add PandaDoc widgets.
4. Recipients: **Seller** and **Buyer** roles. Contact emails are the first Owner (else Admin) membership emails, same as the form contact email today.
5. Declaration rows (interim): FDU1465 has three Transferor and three Transferee rows; FDU1469 has three lessor blocks and two lessee blocks. Until dedicated QLD transfer signatories ship, FQX places **1–N rows per side** from that side’s Owner/Admin count (`min(3, max(1, count))`, capped by form capacity), all assigned to the single Seller or Buyer PandaDoc recipient.

PandaDoc templates that recreate the whole FDU are out of scope. Signing widgets are placed with the Create Document Fields API after upload, not by drawing tags into the PDF.

### Parallel signing (this is the online time saving)

PandaDoc supports both:

- Same `signing_order` → parties receive the document together (parallel).
- Different `signing_order` → lower number signs first; the next group is blocked until the current group finishes.

This phase uses **parallel** signing: Seller and Buyer both get `signing_order: 1`. They can open **Sign Online** at the same time. PandaDoc keeps one document; each recipient only completes the fields assigned to their role. The document is complete when **every** recipient has finished.

That is a deliberate difference from the offline pack, which stays seller-then-admin-check-then-buyer. Do not add an FQX seller-pack gate on the PandaDoc channel; that would reintroduce the wait this flow exists to remove.

PandaDoc has no Australian-legal “witness” recipient type. Witness blocks stay **fields on that party’s signing session**. Copy on **Sign Online** must say the witness must be **physically present** and complete the witness block before the party finishes. A PandaDoc field is not itself a witness. Fisheries Queensland acceptance of an electronically signed FDU is a regulator question; this phase still records FQ submission manually.

### Sign Online and completion

1. FQX sends the PandaDoc document with `silent: true` so PandaDoc does not email parties. FQX remains the notification source (same as other product mail).
2. After send, **both** the seller and the buyer (Owner or Admin of their organisation) see **Sign Online**. Each request asks the server for a session for **that** recipient (`POST /public/v1/documents/{id}/session`) and embeds signing in FQX (`pandadoc-signing`). Do not treat iframe `document.completed` as authoritative. A party that has already completed no longer sees the button; they see that they are waiting for the other party if needed.
3. Webhook `recipient_completed` records which recipient finished (seller or buyer). It does **not** move the application to admin review. Email that party a confirmation; do not wait to invite the other party (they were already invited).
4. Webhook `document_completed_pdf_ready` (both recipients done and sealed PDF ready) downloads `/download-protected`, stores it as `SIGNED_PACK` (never overwrite previous files), and moves child status to `ADMIN_REVIEW`.
5. Opening the order page reconciles PandaDoc document and recipient status if a webhook was missed (same pattern as Stripe payment reconcile).
6. Admin then uses the existing FQ tracking steps. Approved still calls `simulate_transfer`.

## Flow

### Shared through compliance

1. Payment, reservation, and compliance stay as they are, except Queensland compliance gains the signing-channel control described above.
2. Approving compliance still moves the order to `AWAITING_TRANSFER` and creates/uses `transfer_applications` with `QLD_SALE` or `QLD_LEASE`. Set `signing_channel` from the saved compliance choice.

### Offline channel (`OFFLINE`)

Unchanged from Phase 10:

`READY` → generate unsigned PDF, email seller → `AWAITING_SELLER_SIGNATURE` → seller (or admin) upload → `AWAITING_SELLER_PACK_REVIEW` → admin seller-pack checklist → `AWAITING_BUYER_SIGNATURE` → buyer (or admin) upload completed pack → `ADMIN_REVIEW` → `SUBMITTED` → `PROCESSING` → `APPROVED` or `ACTION_REQUIRED`.

Party UI, emails, seller-pack checks, nested 1 of 6 captions, and download rules stay as they are for this channel.

### Online channel (`PANDADOC`)

PandaDoc-only child status `AWAITING_SIGNATURES` means both parties may sign. Offline never uses it. PandaDoc never uses `AWAITING_SELLER_SIGNATURE`, `AWAITING_SELLER_PACK_REVIEW`, or `AWAITING_BUYER_SIGNATURE`.

1. From `READY`, admin (or the existing generate action) generates and stores the unsigned PDF, then creates the PandaDoc document from that file, waits until `document.draft`, assigns Seller and Buyer with the **same** `signing_order` (`1`), sends with `silent: true`. Child status becomes `AWAITING_SIGNATURES`. Email **both** parties that they can **Sign Online** on the order. Do not attach or offer the unsigned PDF as a buyer/seller download-to-sign file; signing is in PandaDoc.
2. Either party’s Owner/Admin can click **Sign Online** without waiting for the other. FQX verifies that membership, creates a session for that recipient only, and embeds the document. Witness completes their block in that session while present. Iframe completion is not trusted.
3. `recipient_completed` stores seller and/or buyer completion on the application. Status stays `AWAITING_SIGNATURES` until the sealed PDF is ready. Admin can see who has signed. Do not run the offline seller-pack checklist.
4. `document_completed_pdf_ready` → store sealed PDF as `SIGNED_PACK` → `ADMIN_REVIEW`. Email both parties that FQX is reviewing the completed application. Buyer and seller may download that stored sealed PDF, as they can after completed-pack upload today.
5. Admin records FQ submission as today. On **approved**, call existing `simulate_transfer`. Do not apply quota again.

If PandaDoc reports declined, voided, or expired: `ACTION_REQUIRED`. Admin can correct and generate a **new** unsigned PDF and a **new** PandaDoc document. Previous files and previous PandaDoc ids stay stored; they are hidden from the current document list the same way offline corrections work.

Nested public captions for the online channel: waiting for signatures (both) → FQX review → submitted → processing → approved (action required stays unnumbered). Do not change the offline 1 of 6 labels.

## Signing (this phase)

| Topic | Offline | PandaDoc |
| --- | --- | --- |
| Form content | FQX official PDF | Same PDF uploaded to PandaDoc |
| Party action | Download / upload | **Sign Online** embed |
| Order | Seller then admin check then buyer | Parallel (`signing_order` 1 for both) |
| Witness | Offline, physically present | Same session fields, physically present |
| Completion | Admin stores uploaded pack | Webhook stores sealed PDF |
| Source of truth | Stored upload + admin checks | Verified PandaDoc webhook + stored PDF |
| After completed PDF | Same FQ tracking | Same FQ tracking |

Identity for **Sign Online**: signed-in Owner or Admin of the seller organisation for the Seller session, or of the buyer organisation for the Buyer session. PandaDoc’s session email is the stored recipient for that role (first Owner else Admin). FQX auth is the identity check; do not create a session for the other party, and do not allow Members.

## Pages

| Path | Purpose |
| --- | --- |
| `/admin/settings` | Add **Queensland signing**: default channel Offline pack or Sign online (PandaDoc). Saving is platform-admin only. Audit the change. |
| `/admin/orders` compliance | Queensland orders: required **Signing method** control on Decision (pre-filled from default). Other checks unchanged. Simulated orders unchanged. |
| `/admin/orders` transfer workspace | Branch on `signing_channel`. Offline workspace unchanged. PandaDoc workspace: generate (PDF + PandaDoc send), PandaDoc status, link/id for support, download unsigned and sealed files, no party-upload signing, then the existing FQ submission block once `ADMIN_REVIEW` or later. |
| `/orders/[id]` | Offline transfer panel unchanged when channel is `OFFLINE`. `PANDADOC`: seller and buyer both see **Sign Online** during `AWAITING_SIGNATURES` until their own recipient has completed; then waiting-for-the-other or “FQX reviewing” copy. Both see download of the sealed PDF after it is stored. |
| `/api/pandadoc/webhook` | Signed PandaDoc events. Public POST, no trailing slash, must not sit behind Vercel Authentication (same Preview lesson as Stripe). |

Dashboard Needs attention: while `AWAITING_SIGNATURES`, list **Sign Online** for the seller until seller completion is recorded, and for the buyer until buyer completion is recorded (both can appear at once). Keep existing offline prepare/sign/upload tasks only for `OFFLINE` applications.

## Database

Migration under `supabase/migrations/` (GitHub is source of truth). Suggested shape:

- `platform_settings.qld_default_signing_channel` `text not null default 'OFFLINE'` check in (`OFFLINE`, `PANDADOC`)
- `orders.qld_signing_channel` `text` null until saved on a Queensland compliance checklist; check in (`OFFLINE`, `PANDADOC`); ignored for simulated processes
- `transfer_applications.signing_channel` `text not null default 'OFFLINE'` check in (`OFFLINE`, `PANDADOC`)
- `transfer_applications.pandadoc_document_id` `text` null, unique when present
- `transfer_applications.pandadoc_status` `text` null (last verified PandaDoc status string)
- `transfer_applications.pandadoc_seller_completed_at` / `pandadoc_buyer_completed_at` `timestamptz` null (set from verified `recipient_completed` or reconcile; not from the browser)
- Extend `transfer_applications` status check to include `AWAITING_SIGNATURES` (PandaDoc parallel wait only)
- `pandadoc_webhook_events` event id primary key (idempotent, same idea as `stripe_webhook_events`)

RLS: parties do not update PandaDoc ids. Server uses service role after webhook verify, or security-definer RPCs for generate/session that check organisation role.

Extend `update_platform_settings` for the new column. Extend `save_compliance_checklist` (or a sibling RPC) so the signing channel is persisted only while `AWAITING_COMPLIANCE` and only on Queensland orders. `approve_compliance` / application insert copies `orders.qld_signing_channel` onto `transfer_applications.signing_channel` and refuses approve if it is missing on a QLD order.

Do not add PandaDoc rows for simulated applications.

## Environment

PandaDoc **sandbox** keys only in this phase (same stance as Stripe test mode).

| Variable | Purpose |
| --- | --- |
| `PANDADOC_API_KEY` | Server-only API key. Never `NEXT_PUBLIC_`. |
| `PANDADOC_WEBHOOK_SHARED_KEY` | HMAC verification for `/api/pandadoc/webhook`. |

Webhook URL must be exactly `https://<host>/api/pandadoc/webhook` with no trailing slash. Preview must be reachable without Vercel login. Document this in `docs/environments.md`.

If keys are missing, `PANDADOC` cannot be selected; `OFFLINE` still works.

## Email

Reuse existing transfer mail where the copy still fits. Add or adjust copy so:

- Offline seller/buyer mail still talks about download and upload.
- PandaDoc generate mails **both** parties at once: open the order and **Sign Online**, witness physically present. They do not wait on each other.
- A recipient-complete mail confirms that party has signed and, if the other has not, says FQX is waiting on the other party.
- Do not attach the unsigned PDF on PandaDoc generate mail. Offline seller mail still includes or links that file as today.

Disable switches on `/admin/settings` still apply.

## Tests

- Process routing still returns `QLD_SALE` / `QLD_LEASE` / `SIMULATED` from jurisdiction + offering only.
- Default channel is `OFFLINE`; settings update is admin-only.
- Compliance approve on a QLD order without a saved channel is refused.
- Application `signing_channel` is copied at approve and does not change afterwards.
- Offline generate/upload/download rules still pass for `OFFLINE`.
- `PANDADOC` generate refuses without API key; with a test double, it stores `pandadoc_document_id` and does not create party-upload signing actions.
- Webhook handler rejects bad signatures, is idempotent, and does not mark complete from iframe-shaped input.
- Buyer Sign Online is allowed as soon as the PandaDoc document is sent; it is refused only for the wrong organisation, Members, or after that recipient has already completed.
- `AWAITING_SIGNATURES` is used only when `signing_channel` is `PANDADOC`.
- `APPROVED` still calls `simulate_transfer` once; quota ledger quantity unchanged at that step.

Lint and production build must pass.

## Acceptance criteria

1. An existing Queensland offline order (or a new order with channel `OFFLINE`) still shows generate, seller download/upload, seller-pack review, buyer download/upload, and FQ tracking. No **Sign Online** button.
2. `/admin/settings` can set the default Queensland signing channel to Offline or PandaDoc. New QLD compliance reviews pre-fill that default. Changing the default does not alter orders already saved or approved.
3. Admin can set Offline or PandaDoc on a QLD order during compliance. Approve is blocked until that choice is saved. After approve, the transfer workspace follows only that channel.
4. A `PANDADOC` order generates the official unsigned PDF, uploads it to PandaDoc, emails **both** parties to **Sign Online**, and shows **Sign Online** to seller and buyer at the same time.
5. After one party’s verified `recipient_completed` (or reconcile), that party’s button is gone and the other can still sign. Child status stays `AWAITING_SIGNATURES` until the sealed PDF is stored.
6. After a verified completed-PDF webhook (or reconcile), FQX stores the sealed PDF as `SIGNED_PACK` and the workspace is on completed-pack / FQ tracking. Recording FQ approved still calls `simulate_transfer`.
7. A PandaDoc iframe or query-string “success” cannot by itself move transfer status.
8. Simulated (non-QLD) orders are unchanged.
9. Lint, production build, and the tests above pass.

## What this phase will not do

- Change or remove the Phase 10 offline QLD flow (including its seller-first order)
- Sequential PandaDoc signing (seller then buyer) or an FQX seller-pack gate on the online channel
- PandaDoc as a second source of form field data (tokens replacing FQX PDF fill)
- Live (non-sandbox) PandaDoc keys as a requirement
- PandaDoc Identity Verification add-on, SMS delivery, or PandaDoc-branded emails
- Acrobat Sign or any other e-sign vendor
- Fisheries Queensland portal/API, live Stripe keys, seller bank payouts, refunds, chargebacks
- Other jurisdictions’ real transfer processes
- Treating an on-screen checkbox as a legal witness

## Deferred (agreed, not building yet)

**QLD transfer signatories (1–3 per business)** — shelved; implement later in this phase when ready.

- Not a new membership role. Keep `OWNER` / `ADMIN` / `MEMBER`. Signing is a separate QLD list on Business Settings → Details (Queensland block).
- Ordered 1–3 people from existing members (any role); invite if needed. Require name + email.
- Table shape: `organisation_qld_signatories` (`organisation_id`, `organisation_user_id`, `sort_order` 1–3).
- Snapshot onto the transfer application at generate. Refuse generate (offline and PandaDoc) if seller or buyer list is missing or invalid.
- PandaDoc: one recipient per listed person, each only their declaration row(s). Listed people can view the order and Sign Online for their slot.
- Offline: same list drives row count and who must wet-ink; upload stays Owner/Admin for now.
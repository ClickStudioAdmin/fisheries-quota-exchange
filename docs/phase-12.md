# Phase 12 — QLD custodial lease holdings

## Status

In progress. Implementation is in place (migration, holdings custody/release, listing gates, lease FishNet outbound, notifications). Finish acceptance testing on `develop` before marking complete.

## Purpose

Introduce **temporary FishNet custodianship** for Queensland quota so FQX can run **leases** without FDU1469 paperwork.

- Members move quota to FQX as **custodian only** (FQX does not own it).
- Custodial quota may be listed for **lease** (fixed price and auction).
- Regular (non-custodial) quota may be listed for **sale only** and keeps the existing two-party transfer documents (FDU1465 / offline or PandaDoc).
- After a lease is paid, FQX returns/transfers the units to the buyer on FishNet (manual admin step).
- Members may **request release** of custodial quantity back to themselves; admin completes FishNet instant transfer and marks the request done.

This phase is **Queensland only**. Other jurisdictions’ lease processes are not designed yet.

Never trust the browser for custody receipt, release completion, outbound lease transfer, payment status, or ledger balances. Never delete quota ledger rows.

## Decisions (locked)

### Custody vs ownership

| Kind | Meaning | May list as |
| --- | --- | --- |
| `MEMBER` (non-custodial) | Member holds units on FishNet themselves | **Sale only** (existing FDU1465 path) |
| `FQX_CUSTODIAL` | Temporary transfer to FQX; FQX holds for the member | **Lease only** (fixed price + auction) |

Temporary custodianship is **not** available for sales. Selling still requires the two-party signed transfer model.

### Holding-first (not listing-first)

Custodianship is managed on the **Quota Holding** surfaces, independent of create listing:

1. Member requests custodial quota (fishery, quantity, …).
2. Holding sits **pending verification** until FishNet inbound is confirmed.
3. Admin verifies receipt → holding `VERIFIED` and listable for lease.
4. If inbound never happens, admin **cancels** the pending custodial holding.

No listing mid-state for “waiting on FishNet.” Listings are created only from **verified** holdings, with offering gated by custody kind.

### Lease order path (no FDU1469)

For QLD leases from custodial holdings:

1. Listing/auction approved and published as today (content checklist; no FishNet inbound on the listing).
2. Buyer leases → pays.
3. Admin completes **outbound FishNet** as one process with a **saveable checklist** (extra checks allowed; same layout pattern as other admin checklists).
4. On complete: ledger move, reservation consumed, listing `SOLD`, order completed / settled (including seller payout path as designed).

Retire live `QLD_LEASE` / FDU1469 / lease offline pack / lease PandaDoc. Archive unused code or templates if useful; do not leave UI entry points.

### Return custody to member

1. Member requests **release** of an amount from a verified custodial holding (≤ available / uncommitted custodial quantity).
2. Request is pending until admin acts.
3. Admin signs into FishNet, completes the **instant transfer** back to the member, then marks the request **completed**.
4. At that moment: custodial quantity decreases via an immutable ledger event; member-held (non-custodial) quantity increases accordingly (or the custodial holding is reduced and a member holding is created/increased—same net effect).

Cancel rules: member or admin may cancel a **pending** release request before completion. Completed releases are not undone in place (correction = new inbound request if needed).

Release quantity must not break open lease listings/auctions or active reservations (same commitment rules as other holding reductions).

### Auctions

Lease auctions follow the same custody and outbound rules as fixed-price leases.

### Scope limits

- QLD only.
- No FishNet API (manual admin confirmation only).
- No change to sale / FDU1465 / Phase 10–11 sale PandaDoc behaviour.
- Non-QLD lease offerings stay as today until a later phase designs them (or remain gated off for custodial features).

## Flows

### A. Request custodial inbound

```text
Holdings → Request custodial quota
        ↓
PENDING verification (awaiting FishNet inbound to FQX)
        ↓
Member transfers temporarily to FQX on FishNet (outside FQX)
        ↓
Admin verifies (holding checklist) → VERIFIED custodial holding
```

Admin may **cancel** pending custodial if inbound never happens.

### B. List lease / lease auction

```text
Verified FQX_CUSTODIAL holding → create LEASE listing or auction
        ↓
PENDING_APPROVAL → admin listing checks → PUBLISHED
        ↓
Buyer leases → pays
        ↓
Admin outbound FishNet checklist → complete / settle
```

### C. Return custody (release)

```text
Verified custodial holding → Request release (quantity)
        ↓
PENDING release request
        ↓
Admin FishNet instant transfer to member → mark completed
        ↓
Custodial quantity decreases; member-held quantity increases
```

### D. Sale (unchanged)

```text
Verified MEMBER holding → SALE listing/auction → pay → compliance
        → FDU1465 offline or PandaDoc → FQ tracking → settlement
```

## Data model (suggested)

- `quota_holdings.custody_kind` `MEMBER` | `FQX_CUSTODIAL` (QLD custodial rows only for this phase).
- Extend holding verification checklist for **inbound custody** checks (FishNet reference, quantity, fishery, temporary-only acknowledgment).
- `custody_release_requests` (or equivalent): organisation, holding, quantity, status (`PENDING` | `COMPLETED` | `CANCELLED`), timestamps, admin notes / FishNet reference.
- Order lease outbound: checklist column or reuse pattern like `compliance_checklist` / listing checks; status path that skips transfer-application PDF for leases.
- Immutable ledger events for: inbound custody confirm, release to member, lease outbound to buyer (`LEASE_OUT` / `LEASE_IN` as appropriate). Never edit balances in place.
- Audit events for every admin and member action in this phase.

Listing/auction RPCs:

- Refuse `LEASE` unless covering holding is QLD `FQX_CUSTODIAL` + `VERIFIED`.
- Refuse `SALE` if covering holding is `FQX_CUSTODIAL`.

## Notifications and Needs attention

Wire **product email + in-app notices** (existing `notify*` / `user_notifications` / disabled-email switches) for every suitable event. Respect organisation `notification_roles` and mute settings.

| Event | Who (typical) | Channel |
| --- | --- | --- |
| Custodial inbound requested | Admins (Needs attention + optional mail) | Admin badge / queue; optional platform-admin mail if that pattern exists |
| Custodial inbound verified | Member org | Email + in-app |
| Custodial inbound cancelled (admin) | Member org | Email + in-app |
| Release requested | Admins | Needs attention |
| Release completed | Member org | Email + in-app |
| Release cancelled | Member org (if admin) / confirm to requester | Email + in-app as suitable |
| Lease listing created / published / rejected / cancelled | Existing listing notices where they already apply | Keep + ensure lease copy is accurate |
| Lease order paid / awaiting outbound | Admins + parties as suitable | Needs attention; party mail |
| Outbound FishNet completed / order completed | Buyer + seller | Email + in-app (align with settlement notices) |
| Action required on outbound | Parties / admin | Email + in-app |

Dashboard **Needs attention** (member): pending inbound instructions, pending release, lease listing/order tasks that already fit the pattern.

Admin **Needs attention** / badges: pending custodial verify, pending release, lease outbound queue.

Do not spam: one-shot dispatches where the platform already uses `email_dispatches`; global `disabled_emails` still applies.

## UI

| Surface | Change |
| --- | --- |
| Holdings (dashboard) | Show custody kind; **Request custodial quota**; **Request release**; pending states; copy that custody is temporary and FQX does not own the quota |
| Holding detail | History of inbound / release / lease commitments |
| `/admin/holdings` | Inbound custody checklist; cancel pending inbound; complete / cancel release requests |
| Create listing / auction | Enforce sale vs lease by custody kind; clear errors |
| `/admin/listings` | Unchanged pattern for approve; leases do not wait on FishNet here |
| `/admin/orders` (QLD lease) | Outbound FishNet checklist workspace (no FDU/PandaDoc); then complete/settle |
| Marketplace | Published leases from custodial stock only |

## Retire / archive

Remove from live routing and UI:

- `QLD_LEASE` → FDU1469 generate, offline lease pack, Phase 11 lease PandaDoc field layouts, lease signing-channel expectations for paperwork.

Sales `QLD_SALE` / FDU1465 / Phase 11 sale PandaDoc stay.

Optional: keep FDU1469 assets under an archive path or unused modules without entry points.

## Implementation slices

1. Migration: custody kind, release requests, ledger/audit events, lease outbound checklist fields.
2. Holdings UI + RPCs: request inbound, admin verify/cancel; request release, admin complete/cancel.
3. Listing/auction gates (sale vs lease by custody).
4. Lease order path: skip transfer PDF; outbound checklist → settlement/complete.
5. Retire FDU1469 / lease PandaDoc from live paths; archive as needed.
6. Notifications + Needs attention for all events above.
7. Docs (`database.md`, master-spec Phase 10/11 lease notes), seeds, tests.

## Acceptance criteria

1. Member can request QLD custodial quota from Holdings without creating a listing.
2. Pending custodial holding is not listable until admin verifies FishNet inbound.
3. Admin can cancel pending custodial if inbound never happens; member is notified.
4. Member can request release of an allowed custodial amount; admin completes FishNet return and marks done; custodial quantity decreases via ledger; member is notified.
5. Pending release can be cancelled before completion; notifications fire as suitable.
6. Verified custodial holding can create lease listing/auction only; sale is refused.
7. Non-custodial holding can create sale only; QLD lease is refused.
8. Lease buy → pay → admin outbound checklist → order completed; no FDU1469/PandaDoc.
9. Sale orders still use existing FDU1465 / offline or PandaDoc path.
10. Lease auctions follow the same custody and outbound rules as fixed-price leases.
11. Copy states custodianship is temporary; FQX does not own the quota.
12. Needs attention and product notifications cover inbound, release, and lease outbound events (subject to mute / disabled-email settings).
13. Lint, production build, and tests pass; sale regression tests still pass.

## What this phase will not do

- FishNet or Fisheries Queensland APIs
- Custodianship for sales or non-QLD jurisdictions
- Live Stripe / payout redesign beyond existing settlement hooks
- Phase 11 sale PandaDoc changes
- Dedicated QLD transfer-signatory lists (still deferred from Phase 11)
- Treating temporary custody as a permanent sale to FQX

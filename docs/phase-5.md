# Phase 5 — Fisheries and quota data

## Purpose

Add configurable fishery reference data, quota holdings, and an immutable quota ledger.

Do not assume quota is measured in weight. Do not hard-code regulatory rules.

There are no listings, auctions, or payments in this phase.

## Tables

| Table | Purpose |
| --- | --- |
| `platform_admins` | Emails that may administer reference data |
| `jurisdictions` | Commonwealth, states and territories |
| `fisheries` | A managed fishery under a jurisdiction, with quantity type `KG` or `UNITS` |
| `stocks` | Named stock or area within a fishery |
| `seasons` | Date-bounded seasons for a fishery |
| `quota_types` | Per-fishery type with `WEIGHT`, `UNITS`, `EFFORT` or `OTHER` and a unit label |
| `fishery_rules` | Configurable `code` + JSON `value` |
| `quota_holdings` | Organisation holding of a fishery |
| `quota_ledger` | Immutable quantity events |

Australian jurisdictions are seeded. A development fixture migration also adds fisheries, stocks, seasons and quota types with `DEV-` codes. These are test records, not official regulatory data. Migration `20260817210000_strip_dev_fishery_names.sql` removes the `DEV` prefix from fishery names.

## Ledger

`quota_ledger` cannot be updated or deleted. Creating a holding calls `create_quota_holding`, which inserts the holding and an `INITIAL_ALLOCATION` row in one transaction.

Quantity on the holding is only written by that function.

## Admin

The first signed-in user may claim **platform admin** at `/admin` if the table is empty.

Admin can then:

1. Create a fishery for a jurisdiction, including quantity type (Kg or Units)
2. Add stock, season, quota type and optional rules
3. Create a test holding for an organisation (organisation, fishery, quantity, note)

Members of that organisation can see the holding and ledger at `/dashboard/holdings`.

## Not in this phase

- Marketplace listings
- Transfers, sales, leases (ledger event types exist for later phases)
- Authority integrations

## Acceptance criteria

- Platform admin can create a test fishery
- Platform admin can create a test quota holding
- Quota ledger records `INITIAL_ALLOCATION`
- A `MEMBER` of the organisation can see the holding
- Push to `develop` applies the migration
- Vercel Preview build succeeds

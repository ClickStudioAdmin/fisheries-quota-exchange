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
| `authorities` | Management agencies under a jurisdiction |
| `fisheries` | A managed fishery |
| `species` | Species names |
| `stocks` | Species within a fishery (named stock/area) |
| `seasons` | Date-bounded seasons for a fishery |
| `quota_types` | Per-fishery type with `WEIGHT`, `UNITS`, `EFFORT` or `OTHER` and a unit label |
| `fishery_rules` | Configurable `code` + JSON `value` |
| `quota_holdings` | Organisation holding of a stock/season/type |
| `quota_ledger` | Immutable quantity events |

Australian jurisdictions are seeded. A development fixture migration also adds `DEV-` authorities, fisheries, stocks, seasons and quota types. These are test records, not official regulatory data.

## Ledger

`quota_ledger` cannot be updated or deleted. Creating a holding calls `create_quota_holding`, which inserts the holding and an `INITIAL_ALLOCATION` row in one transaction.

Quantity on the holding is only written by that function.

## Admin

The first signed-in user may claim **platform admin** at `/admin` if the table is empty.

Admin can then:

1. Add an authority and species
2. Create a fishery
3. Add stock, season, quota type and optional rules
4. Create a test holding for an organisation

Members of that organisation can see the holding and ledger on the organisation page.

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

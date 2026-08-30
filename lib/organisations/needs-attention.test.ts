import assert from "node:assert/strict";
import test from "node:test";
import {
  memberActionCountBuckets,
  organisationNeedsAttentionItems,
} from "./needs-attention.ts";

const fisheries = [{ name: "East Coast Spanish Mackerel Fishery", jurisdiction_id: 1 }];
const jurisdictions = [
  { id: 1, code: "QLD" },
  { id: 2, code: "CWLTH" },
];

function order(
  overrides: Partial<Parameters<typeof organisationNeedsAttentionItems>[0]["orders"][number]> & {
    id: number;
  },
) {
  return {
    status: "AWAITING_TRANSFER",
    fishery_name: "East Coast Spanish Mackerel Fishery",
    offering: "SALE" as const,
    buyer_organisation_id: 10,
    seller_organisation_id: 20,
    ...overrides,
  };
}

test("organisationNeedsAttentionItems lists pay, QLD documents, compliance updates, and ended auctions", () => {
  const items = organisationNeedsAttentionItems({
    organisationId: 10,
    canManage: true,
    now: new Date("2026-08-20T05:00:00.000Z"),
    fisheries,
    jurisdictions,
    transferByOrderId: new Map([
      [3634, { process_code: "QLD_SALE", status: "READY" }],
      [3635, { process_code: "QLD_SALE", status: "AWAITING_BUYER_SIGNATURE" }],
      [3636, { process_code: "SIMULATED", status: "READY" }],
    ]),
    complianceNotesByOrderId: new Map([
      [3633, { buyer: "Add the client number.", seller: null }],
    ]),
    orders: [
      order({
        id: 3632,
        status: "AWAITING_PAYMENT",
        fishery_name: "Northern Prawn Fishery",
      }),
      order({ id: 3633, status: "AWAITING_COMPLIANCE" }),
      order({ id: 3634 }),
      order({ id: 3635 }),
      order({
        id: 3636,
        fishery_name: "Northern Prawn Fishery",
        status: "AWAITING_TRANSFER",
      }),
    ],
    listings: [
      {
        id: 88,
        listing_type: "AUCTION",
        status: "PUBLISHED",
        expires_at: "2026-08-19T00:00:00.000Z",
        fishery_name: "Coral Trout",
      },
      {
        id: 89,
        listing_type: "AUCTION",
        status: "PUBLISHED",
        expires_at: "2026-08-21T00:00:00.000Z",
        fishery_name: "Still live",
      },
    ],
  });

  assert.deepEqual(
    items.map((item) => ({
      title: item.title,
      detail: item.detail,
      actionLabel: item.actionLabel,
    })),
    [
      {
        title: "Pay order 3632",
        detail: "Northern Prawn Fishery",
        actionLabel: "Go to order",
      },
      {
        title: "Update order 3633 details",
        detail: "East Coast Spanish Mackerel Fishery",
        actionLabel: "Go to order",
      },
      {
        title: "Sign and upload transfer documents for order 3635",
        detail: "East Coast Spanish Mackerel Fishery",
        actionLabel: "Go to order",
      },
      {
        title: "Close auction 88",
        detail: "Coral Trout",
        actionLabel: "Go to auction",
      },
    ],
  );
  assert.equal(items.find((item) => item.key === "pay-3632")?.href, "/orders/3632");
  assert.equal(items.find((item) => item.key === "auction-88")?.href, "/auctions/88");
  assert.deepEqual(memberActionCountBuckets(items), {
    orders: 3,
    listings: 1,
    holdings: 0,
    overview: 4,
  });
});

test("organisationNeedsAttentionItems skips seller pay, other-party updates, and simulated transfer", () => {
  const items = organisationNeedsAttentionItems({
    organisationId: 20,
    canManage: true,
    fisheries,
    jurisdictions,
    transferByOrderId: new Map([
      [1, { process_code: "SIMULATED", status: "READY" }],
    ]),
    complianceNotesByOrderId: new Map([
      [2, { buyer: "Buyer only.", seller: null }],
    ]),
    orders: [
      order({
        id: 1,
        status: "AWAITING_TRANSFER",
        fishery_name: "Northern Prawn Fishery",
      }),
      order({ id: 2, status: "AWAITING_COMPLIANCE" }),
      order({
        id: 3,
        status: "AWAITING_PAYMENT",
        fishery_name: "Northern Prawn Fishery",
      }),
    ],
    listings: [],
  });

  assert.deepEqual(items, []);
});

test("organisationNeedsAttentionItems infers QLD prepare when no application row exists", () => {
  const items = organisationNeedsAttentionItems({
    organisationId: 20,
    canManage: true,
    fisheries,
    jurisdictions,
    orders: [order({ id: 9 })],
    listings: [],
  });

  assert.deepEqual(items, [
    {
      key: "transfer-9",
      href: "/orders/9",
      title: "Prepare transfer documents for order 9",
      detail: "East Coast Spanish Mackerel Fishery",
      actionLabel: "Go to order",
    },
  ]);
});

test("organisationNeedsAttentionItems drops cancelled, rejected, and expired-payment orders", () => {
  const items = organisationNeedsAttentionItems({
    organisationId: 10,
    canManage: true,
    fisheries,
    jurisdictions,
    paymentStatusByOrderId: new Map([[3632, "EXPIRED"]]),
    complianceNotesByOrderId: new Map([
      [8, { buyer: "Update ABN.", seller: null }],
    ]),
    transferByOrderId: new Map([
      [7, { process_code: "QLD_SALE", status: "READY" }],
    ]),
    orders: [
      order({
        id: 3632,
        status: "AWAITING_PAYMENT",
        fishery_name: "Northern Prawn Fishery",
      }),
      order({
        id: 5,
        status: "CANCELLED",
        fishery_name: "Northern Prawn Fishery",
      }),
      order({ id: 7, status: "CANCELLED" }),
      order({ id: 8, status: "REJECTED" }),
      order({ id: 9, status: "COMPLETED" }),
    ],
    listings: [
      {
        id: 88,
        listing_type: "AUCTION",
        status: "UNSOLD",
        expires_at: "2026-08-19T00:00:00.000Z",
        fishery_name: "Coral Trout",
      },
    ],
  });

  assert.deepEqual(items, []);
});

test("organisationNeedsAttentionItems is empty without manage permission", () => {
  const items = organisationNeedsAttentionItems({
    organisationId: 10,
    canManage: false,
    orders: [
      order({
        id: 1,
        status: "AWAITING_PAYMENT",
        fishery_name: "Northern Prawn Fishery",
      }),
    ],
    listings: [],
  });

  assert.deepEqual(items, []);
});

test("QLD lease awaiting FishNet outbound is listed for parties", () => {
  const items = organisationNeedsAttentionItems({
    organisationId: 10,
    canManage: true,
    fisheries,
    jurisdictions,
    orders: [
      order({
        id: 50,
        offering: "LEASE",
        status: "AWAITING_TRANSFER",
      }),
    ],
    listings: [],
  });

  assert.equal(items.length, 1);
  assert.match(items[0]?.title ?? "", /FishNet outbound/);
});

test("PandaDoc Sign Online is listed for each party until they have signed", () => {
  const transfers = new Map([
    [
      40,
      {
        process_code: "QLD_SALE",
        status: "AWAITING_SIGNATURES",
        signing_channel: "PANDADOC",
        pandadoc_seller_completed_at: null,
        pandadoc_buyer_completed_at: null,
      },
    ],
  ]);
  const sellerItems = organisationNeedsAttentionItems({
    organisationId: 20,
    canManage: true,
    fisheries,
    jurisdictions,
    transferByOrderId: transfers,
    orders: [order({ id: 40 })],
    listings: [],
  });
  const buyerItems = organisationNeedsAttentionItems({
    organisationId: 10,
    canManage: true,
    fisheries,
    jurisdictions,
    transferByOrderId: transfers,
    orders: [order({ id: 40 })],
    listings: [],
  });

  assert.match(sellerItems[0]?.title ?? "", /Sign Online/);
  assert.match(buyerItems[0]?.title ?? "", /Sign Online/);
});

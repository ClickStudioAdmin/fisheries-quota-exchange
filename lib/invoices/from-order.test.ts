import assert from "node:assert/strict";
import test from "node:test";
import { buildTaxInvoiceData } from "./from-order.ts";
import type { Order } from "../orders/types.ts";
import { orderChargeAud } from "../payments/money.ts";

const order: Order = {
  id: 1001,
  listing_id: 1,
  holding_id: 1,
  seller_organisation_id: 2,
  buyer_organisation_id: 3,
  offering: "SALE",
  quantity: "40",
  unused_quantity: null,
  used_quantity: null,
  unit_price_aud: "18.75",
  amount_aud: "750",
  fee_percent: "5",
  fee_amount_aud: "37.50",
  status: "COMPLETED",
  seller_name: "Sample Quota Holdings Pty Ltd",
  buyer_name: "Sample Fisheries Pty Ltd",
  fishery_name: "Northern Prawn Fishery",
  quota_type_name: "Quota",
  measurement_kind: "WEIGHT",
  unit_label: "kg",
  created_by_email: "buyer@example.com",
  created_at: "2026-08-17T00:00:00.000Z",
  updated_at: "2026-08-17T00:00:00.000Z",
  review_note: null,
  compliance_checklist: [],
};

const abns = {
  buyerAbn: "81000000002",
  sellerAbn: "81000000001",
};

test("quota invoice is seller to buyer for the listed amount", () => {
  const invoice = buildTaxInvoiceData("quota", order, abns, 750);

  assert.equal(invoice.kind, "quota");
  assert.equal(invoice.invoiceNumber, "FQX-SIM-1001-Q");
  assert.equal(invoice.supplierName, order.seller_name);
  assert.equal(invoice.recipientName, order.buyer_name);
  assert.equal(invoice.total, "$750.00");
  assert.equal(invoice.lines[0]?.amount, "$750.00");
  assert.equal(invoice.note.includes("Card processing"), false);
});

test("quota invoice notes card processing collected by FQX", () => {
  const invoice = buildTaxInvoiceData(
    "quota",
    order,
    abns,
    orderChargeAud(order.amount_aud),
  );

  assert.equal(invoice.total, "$750.00");
  assert.match(invoice.note, /Card processing of \$13\.\d{2} was collected by FQX/);
});

test("fee invoice is FQX to the seller for the platform fee", () => {
  const invoice = buildTaxInvoiceData("fee", order, abns, 750);

  assert.equal(invoice.kind, "fee");
  assert.equal(invoice.invoiceNumber, "FQX-SIM-1001-F");
  assert.equal(invoice.supplierName, "Fisheries Quota Exchange");
  assert.equal(invoice.recipientName, order.seller_name);
  assert.equal(invoice.total, "$37.50");
  assert.match(invoice.note, /Seller proceeds \$712\.50/);
});

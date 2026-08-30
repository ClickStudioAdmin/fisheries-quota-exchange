import assert from "node:assert/strict";
import test from "node:test";
import { isTaxInvoiceKind, taxInvoicePath } from "./types.ts";

test("isTaxInvoiceKind accepts quota and fee only", () => {
  assert.equal(isTaxInvoiceKind("quota"), true);
  assert.equal(isTaxInvoiceKind("fee"), true);
  assert.equal(isTaxInvoiceKind("tax_invoice"), false);
});

test("taxInvoicePath points at the order invoice kind", () => {
  assert.equal(taxInvoicePath(1001, "quota"), "/orders/1001/invoice/quota");
  assert.equal(taxInvoicePath(1001, "fee"), "/orders/1001/invoice/fee");
});

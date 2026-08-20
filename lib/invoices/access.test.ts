import assert from "node:assert/strict";
import test from "node:test";
import { canDownloadTaxInvoice } from "./access.ts";

test("buyer can download the quota invoice but not the fee invoice", () => {
  assert.equal(
    canDownloadTaxInvoice({
      kind: "quota",
      isAdmin: false,
      isBuyer: true,
      isSeller: false,
    }),
    true,
  );
  assert.equal(
    canDownloadTaxInvoice({
      kind: "fee",
      isAdmin: false,
      isBuyer: true,
      isSeller: false,
    }),
    false,
  );
});

test("seller and admin can download both invoices", () => {
  assert.equal(
    canDownloadTaxInvoice({
      kind: "fee",
      isAdmin: false,
      isBuyer: false,
      isSeller: true,
    }),
    true,
  );
  assert.equal(
    canDownloadTaxInvoice({
      kind: "fee",
      isAdmin: true,
      isBuyer: true,
      isSeller: false,
    }),
    true,
  );
});

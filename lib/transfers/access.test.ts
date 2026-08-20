import assert from "node:assert/strict";
import test from "node:test";
import { canDownloadTransferDocument } from "./access.ts";

test("buyer cannot download the unsigned application", () => {
  assert.equal(
    canDownloadTransferDocument({
      documentType: "UNSIGNED_APPLICATION",
      applicationStatus: "AWAITING_SELLER_SIGNATURE",
      isAdmin: false,
      isBuyer: true,
      isSeller: false,
    }),
    false,
  );
  assert.equal(
    canDownloadTransferDocument({
      documentType: "UNSIGNED_APPLICATION",
      applicationStatus: "AWAITING_SELLER_SIGNATURE",
      isAdmin: false,
      isBuyer: false,
      isSeller: true,
    }),
    true,
  );
});

test("buyer cannot download the seller-signed form until FQX accepts it", () => {
  assert.equal(
    canDownloadTransferDocument({
      documentType: "SELLER_SIGNED",
      applicationStatus: "AWAITING_SELLER_PACK_REVIEW",
      isAdmin: false,
      isBuyer: true,
      isSeller: false,
    }),
    false,
  );
  assert.equal(
    canDownloadTransferDocument({
      documentType: "SELLER_SIGNED",
      applicationStatus: "AWAITING_BUYER_SIGNATURE",
      isAdmin: false,
      isBuyer: true,
      isSeller: false,
    }),
    true,
  );
});

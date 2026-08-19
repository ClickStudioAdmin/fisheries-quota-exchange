import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIVATE_SELLER_LABEL,
  publicSellerDisplay,
} from "./public-seller.ts";

const sellerName = "Southern Bluefin Pty Ltd";

test("publicSellerDisplay keeps the business name when identity is visible", () => {
  assert.deepEqual(
    publicSellerDisplay({
      sellerName,
      hideIdentity: false,
      viewerIsSellerMember: false,
      isPlatformAdmin: false,
    }),
    { label: sellerName, tooltip: null },
  );
});

test("publicSellerDisplay uses Private Seller on public pages", () => {
  assert.deepEqual(
    publicSellerDisplay({
      sellerName,
      hideIdentity: true,
      viewerIsSellerMember: false,
      isPlatformAdmin: false,
    }),
    { label: PRIVATE_SELLER_LABEL, tooltip: null },
  );
});

test("publicSellerDisplay adds the real name as an admin tooltip", () => {
  assert.deepEqual(
    publicSellerDisplay({
      sellerName,
      hideIdentity: true,
      viewerIsSellerMember: false,
      isPlatformAdmin: true,
    }),
    { label: PRIVATE_SELLER_LABEL, tooltip: sellerName },
  );
});

test("publicSellerDisplay shows the real name to the selling business", () => {
  assert.deepEqual(
    publicSellerDisplay({
      sellerName,
      hideIdentity: true,
      viewerIsSellerMember: true,
      isPlatformAdmin: false,
    }),
    { label: sellerName, tooltip: null },
  );
  assert.deepEqual(
    publicSellerDisplay({
      sellerName,
      hideIdentity: true,
      viewerIsSellerMember: true,
      isPlatformAdmin: true,
    }),
    { label: sellerName, tooltip: null },
  );
});

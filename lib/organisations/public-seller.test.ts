import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIVATE_BUYER_LABEL,
  PRIVATE_SELLER_LABEL,
  parseOrganisationHideIdentityRows,
  publicBuyerDisplay,
  publicSellerDisplay,
} from "./public-seller.ts";

const sellerName = "Southern Bluefin Pty Ltd";

test("publicSellerDisplay keeps the business name when identity is visible", () => {
  assert.deepEqual(
    publicSellerDisplay({
      sellerName,
      hideIdentity: false,
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
      isPlatformAdmin: true,
    }),
    { label: PRIVATE_SELLER_LABEL, tooltip: sellerName },
  );
});

const buyerName = "Coastal Catch Pty Ltd";

test("publicBuyerDisplay uses Private Buyer on public auction bids", () => {
  assert.deepEqual(
    publicBuyerDisplay({
      buyerName,
      hideIdentity: true,
      isPlatformAdmin: false,
    }),
    { label: PRIVATE_BUYER_LABEL, tooltip: null },
  );
});

test("publicBuyerDisplay adds the real name as an admin tooltip", () => {
  assert.deepEqual(
    publicBuyerDisplay({
      buyerName,
      hideIdentity: true,
      isPlatformAdmin: true,
    }),
    { label: PRIVATE_BUYER_LABEL, tooltip: buyerName },
  );
});

test("parseOrganisationHideIdentityRows reads organisation_id or id", () => {
  assert.deepEqual(
    [...parseOrganisationHideIdentityRows([
      { organisation_id: "12", hide_identity: true },
      { id: 15, hide_identity: "t" },
    ])],
    [
      [12, true],
      [15, true],
    ],
  );
});

test("parseOrganisationHideIdentityRows accepts a single row object", () => {
  assert.equal(
    parseOrganisationHideIdentityRows({
      organisation_id: 9,
      hide_identity: true,
    }).get(9),
    true,
  );
});

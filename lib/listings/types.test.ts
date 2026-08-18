import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAud,
  formatAudPerUnit,
  listingOfferingLabel,
  listingTypeLabel,
} from "./types.ts";

test("listingOfferingLabel names sale and lease", () => {
  assert.equal(listingOfferingLabel("SALE"), "Sale");
  assert.equal(listingOfferingLabel("LEASE"), "Lease");
});

test("listingTypeLabel names fixed price and auction", () => {
  assert.equal(listingTypeLabel("FIXED_PRICE"), "Fixed price");
  assert.equal(listingTypeLabel("AUCTION"), "Auction");
});

test("formatAudPerUnit uses a slash, not per", () => {
  assert.equal(formatAudPerUnit(12.5, "kg"), `${formatAud(12.5)} / kg`);
});

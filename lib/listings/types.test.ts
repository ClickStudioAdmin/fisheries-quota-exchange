import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAud,
  formatAudPerUnit,
  formatListingTotal,
  listingOfferingLabel,
  listingStatusLabel,
  listingTypeLabel,
} from "./types.ts";

test("listingOfferingLabel names sale and lease", () => {
  assert.equal(listingOfferingLabel("SALE"), "Sale");
  assert.equal(listingOfferingLabel("LEASE"), "Lease");
});

test("listingStatusLabel uses Live for a published listing", () => {
  assert.equal(listingStatusLabel("PUBLISHED"), "Live");
  assert.equal(listingStatusLabel("PENDING_APPROVAL"), "Pending approval");
});

test("listingTypeLabel names fixed price and auction", () => {
  assert.equal(listingTypeLabel("FIXED_PRICE"), "Fixed price");
  assert.equal(listingTypeLabel("AUCTION"), "Auction");
});

test("formatAudPerUnit uses a slash, not per", () => {
  assert.equal(formatAudPerUnit(12.5, "kg"), `${formatAud(12.5)} / kg`);
  assert.equal(formatAudPerUnit(70, "units"), `${formatAud(70)} / Unit`);
});

test("formatListingTotal multiplies quantity by unit price", () => {
  assert.equal(formatListingTotal(1500, 0.55), formatAud(825));
  assert.equal(formatListingTotal("nope", 1), "—");
});

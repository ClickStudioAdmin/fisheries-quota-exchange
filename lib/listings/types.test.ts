import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAud,
  formatAudPerUnit,
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
});

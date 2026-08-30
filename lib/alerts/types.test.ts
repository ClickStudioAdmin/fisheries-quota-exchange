import assert from "node:assert/strict";
import test from "node:test";
import { listingAlertMatches, parseFisheryIds } from "./types.ts";

test("listingAlertMatches uses sale or lease flags", () => {
  assert.equal(listingAlertMatches({ sales: true, leases: false }, "SALE"), true);
  assert.equal(listingAlertMatches({ sales: true, leases: false }, "LEASE"), false);
  assert.equal(listingAlertMatches({ sales: false, leases: true }, "LEASE"), true);
  assert.equal(listingAlertMatches({ sales: false, leases: false }, "SALE"), false);
});

test("parseFisheryIds keeps unique positive integers", () => {
  assert.deepEqual(parseFisheryIds(["1", "1", "2", "nope", "0", "-3"]), [1, 2]);
});

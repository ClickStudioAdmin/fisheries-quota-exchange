import assert from "node:assert/strict";
import test from "node:test";
import {
  fisheryAllowsOffering,
  fisheryNameWithJurisdiction,
  fisheryOfferingOptions,
  fisherySelectLabel,
  holdingVerifyPath,
  parseHoldingIds,
} from "./types.ts";

test("parseHoldingIds reads unique positive integers", () => {
  assert.deepEqual(parseHoldingIds("8, 8 2"), [8, 2]);
  assert.deepEqual(parseHoldingIds(""), []);
});

test("holdingVerifyPath builds a remaining queue URL", () => {
  assert.equal(holdingVerifyPath([8, 2]), "/admin/holdings?queue=8,2");
  assert.equal(holdingVerifyPath([]), "/admin/holdings");
});

test("fisheryNameWithJurisdiction prefixes a jurisdiction code", () => {
  assert.equal(
    fisheryNameWithJurisdiction("East Coast Spanish Mackerel Fishery", "QLD"),
    "QLD - East Coast Spanish Mackerel Fishery",
  );
  assert.equal(
    fisheryNameWithJurisdiction("East Coast Spanish Mackerel Fishery", "  "),
    "East Coast Spanish Mackerel Fishery",
  );
});

test("fisherySelectLabel uses the jurisdiction code prefix", () => {
  assert.equal(
    fisherySelectLabel(
      { name: "East Coast Spanish Mackerel Fishery", jurisdiction_id: 1 },
      [{ id: 1, code: "QLD" }],
    ),
    "QLD - East Coast Spanish Mackerel Fishery",
  );
});

test("fisheryOfferingOptions follows sale and lease flags", () => {
  assert.deepEqual(
    fisheryOfferingOptions({ sale_allowed: true, lease_allowed: true }),
    ["SALE", "LEASE"],
  );
  assert.deepEqual(
    fisheryOfferingOptions({ sale_allowed: false, lease_allowed: true }),
    ["LEASE"],
  );
  assert.equal(
    fisheryAllowsOffering({ sale_allowed: false, lease_allowed: true }, "SALE"),
    false,
  );
  assert.equal(
    fisheryAllowsOffering({ sale_allowed: false, lease_allowed: true }, "LEASE"),
    true,
  );
});

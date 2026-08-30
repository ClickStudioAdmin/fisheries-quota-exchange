import assert from "node:assert/strict";
import test from "node:test";
import { qldListingUsage, quotaUsageTooltip, formatQuantityWithUsage } from "./quota-usage.ts";

test("quotaUsageTooltip lists unused and used with the unit label", () => {
  assert.deepEqual(
    quotaUsageTooltip("4000", "1000", "units"),
    [
      { label: "Unused", value: "4000 units" },
      { label: "Used", value: "1000 units" },
    ],
  );
  assert.equal(quotaUsageTooltip(null, null, "units"), undefined);
});

test("formatQuantityWithUsage appends unused and used when both are stored", () => {
  assert.equal(
    formatQuantityWithUsage("155", "units", "124", "31"),
    "155 units (124 unused / 31 used)",
  );
  assert.equal(formatQuantityWithUsage("40", "kg"), "40 kg");
});

test("qldListingUsage allows omitted used and unused so SQL can default them", () => {
  assert.deepEqual(
    qldListingUsage({ quantity: 5000, unusedRaw: "", usedRaw: "" }),
    { unused: null, used: null },
  );
});

test("qldListingUsage requires used and unused when creating a QLD listing", () => {
  assert.deepEqual(
    qldListingUsage({
      quantity: 5000,
      unusedRaw: "",
      usedRaw: "",
      required: true,
    }),
    { error: "Enter unused and used quantities." },
  );
});

test("qldListingUsage requires both parts when either is entered", () => {
  assert.deepEqual(
    qldListingUsage({ quantity: 5000, unusedRaw: "4000", usedRaw: "" }),
    { error: "Enter both unused and used quantities." },
  );
});

test("qldListingUsage requires unused plus used to equal the listing quantity", () => {
  assert.deepEqual(
    qldListingUsage({ quantity: 5000, unusedRaw: "4000", usedRaw: "1000" }),
    { unused: 4000, used: 1000 },
  );
  assert.deepEqual(
    qldListingUsage({ quantity: 5000, unusedRaw: "4000", usedRaw: "500" }),
    { error: "Unused and used quantities must add up to the listing quantity." },
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { qldListingUsage } from "./quota-usage.ts";

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

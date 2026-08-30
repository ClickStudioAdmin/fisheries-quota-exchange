import assert from "node:assert/strict";
import test from "node:test";
import { holdingVerificationChecks } from "./verification-checks.ts";

test("holdingVerificationChecks adds Queensland steps only for QLD", () => {
  const shared = holdingVerificationChecks("CTH");
  const qld = holdingVerificationChecks("QLD");

  assert.equal(shared.length, 4);
  assert.ok(shared.every((item) => qld.includes(item)));
  assert.ok(qld.some((item) => item.includes("Queensland fisheries client number")));
  assert.ok(qld.some((item) => item.toLowerCase().includes("transfer")));
  assert.equal(holdingVerificationChecks(null).length, 4);
});

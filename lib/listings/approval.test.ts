import assert from "node:assert/strict";
import test from "node:test";
import { listingApprovalChecks } from "./approval-checks.ts";

test("listingApprovalChecks adds auction and Queensland steps only when needed", () => {
  const shared = listingApprovalChecks("CTH", "FIXED_PRICE");
  const auction = listingApprovalChecks("CTH", "AUCTION");
  const qld = listingApprovalChecks("QLD", "FIXED_PRICE");
  const qldAuction = listingApprovalChecks("QLD", "AUCTION");

  assert.equal(shared.length, 4);
  assert.ok(shared.every((item) => auction.includes(item)));
  assert.ok(auction.some((item) => item.toLowerCase().includes("auction")));
  assert.ok(qld.some((item) => item.includes("Queensland fisheries client number")));
  assert.ok(qld.some((item) => item.toLowerCase().includes("transfer")));
  assert.equal(listingApprovalChecks(null, "FIXED_PRICE").length, 4);
  assert.equal(qldAuction.length, shared.length + 3);
});

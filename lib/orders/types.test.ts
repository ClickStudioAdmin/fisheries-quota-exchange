import assert from "node:assert/strict";
import test from "node:test";
import { orderQueuePath, orderStatusLabel, parseOrderIds } from "./types.ts";

test("orderQueuePath builds a remaining queue URL", () => {
  assert.equal(orderQueuePath([12, 3]), "/admin/orders?queue=12,3");
  assert.equal(orderQueuePath([]), "/admin/orders");
});

test("parseOrderIds reads unique positive integers", () => {
  assert.deepEqual(parseOrderIds("12, 12 3"), [12, 3]);
  assert.deepEqual(parseOrderIds(""), []);
  assert.deepEqual(parseOrderIds(null), []);
});

test("orderStatusLabel uses Queensland child status during transfer", () => {
  assert.equal(orderStatusLabel("AWAITING_TRANSFER"), "Awaiting transfer");
  assert.equal(
    orderStatusLabel("AWAITING_TRANSFER", {
      usesSimulatedTransfer: true,
    }),
    "Awaiting transfer",
  );
  assert.equal(
    orderStatusLabel("AWAITING_TRANSFER", {
      usesSimulatedTransfer: false,
    }),
    "Waiting for application",
  );
  assert.equal(
    orderStatusLabel("AWAITING_TRANSFER", {
      usesSimulatedTransfer: false,
      applicationStatus: "AWAITING_SIGNED_PACK",
    }),
    "Waiting for signed documents",
  );
  assert.equal(
    orderStatusLabel("AWAITING_TRANSFER", {
      usesSimulatedTransfer: false,
      applicationStatus: "SUBMITTED",
    }),
    "With Fisheries Queensland",
  );
});

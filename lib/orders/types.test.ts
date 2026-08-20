import assert from "node:assert/strict";
import test from "node:test";
import {
  adminTransferActionLabel,
  orderQueuePath,
  orderStatusLabel,
  parseOrderIds,
} from "./types.ts";

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
    "1 of 6 · Waiting for application",
  );
  assert.equal(
    orderStatusLabel("AWAITING_TRANSFER", {
      usesSimulatedTransfer: false,
      applicationStatus: "AWAITING_SELLER_SIGNATURE",
    }),
    "2 of 6 · Waiting for seller to sign",
  );
  assert.equal(
    orderStatusLabel("AWAITING_TRANSFER", {
      usesSimulatedTransfer: false,
      applicationStatus: "ADMIN_REVIEW",
    }),
    "5 of 6 · Reviewing completed pack",
  );
  assert.equal(
    orderStatusLabel("AWAITING_TRANSFER", {
      usesSimulatedTransfer: false,
      applicationStatus: "SUBMITTED",
    }),
    "6 of 6 · With Fisheries Queensland",
  );
  assert.equal(
    orderStatusLabel("AWAITING_TRANSFER", {
      usesSimulatedTransfer: false,
      applicationStatus: "ACTION_REQUIRED",
    }),
    "Action required",
  );
});

test("adminTransferActionLabel names the Queensland workspace vs simulate", () => {
  assert.equal(adminTransferActionLabel(true), "Simulate transfer");
  assert.equal(adminTransferActionLabel(false), "Open transfer");
});

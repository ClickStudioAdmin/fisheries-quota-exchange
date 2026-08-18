import assert from "node:assert/strict";
import test from "node:test";
import { orderQueuePath, parseOrderIds } from "./types.ts";

test("orderQueuePath builds a remaining queue URL", () => {
  assert.equal(orderQueuePath([12, 3]), "/admin/orders?queue=12,3");
  assert.equal(orderQueuePath([]), "/admin/orders");
});

test("parseOrderIds reads unique positive integers", () => {
  assert.deepEqual(parseOrderIds("12, 12 3"), [12, 3]);
  assert.deepEqual(parseOrderIds(""), []);
  assert.deepEqual(parseOrderIds(null), []);
});

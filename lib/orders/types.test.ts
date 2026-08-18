import assert from "node:assert/strict";
import test from "node:test";
import { parseOrderIds } from "./types.ts";

test("parseOrderIds reads unique positive integers", () => {
  assert.deepEqual(parseOrderIds("12, 12 3"), [12, 3]);
  assert.deepEqual(parseOrderIds(""), []);
  assert.deepEqual(parseOrderIds(null), []);
});

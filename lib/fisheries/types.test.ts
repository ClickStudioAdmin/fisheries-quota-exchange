import assert from "node:assert/strict";
import test from "node:test";
import { holdingVerifyPath, parseHoldingIds } from "./types.ts";

test("parseHoldingIds reads unique positive integers", () => {
  assert.deepEqual(parseHoldingIds("8, 8 2"), [8, 2]);
  assert.deepEqual(parseHoldingIds(""), []);
});

test("holdingVerifyPath builds a remaining queue URL", () => {
  assert.equal(holdingVerifyPath([8, 2]), "/admin/holdings?queue=8,2");
  assert.equal(holdingVerifyPath([]), "/admin/holdings");
});

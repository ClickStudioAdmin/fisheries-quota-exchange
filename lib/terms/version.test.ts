import assert from "node:assert/strict";
import test from "node:test";
import {
  TERMS_REQUIRED_MESSAGE,
  TERMS_UPDATED_LABEL,
  TERMS_VERSION,
} from "./version.ts";

test("terms version is a calendar date used on the terms page", () => {
  assert.match(TERMS_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(TERMS_UPDATED_LABEL, /August 2026/);
  assert.match(TERMS_REQUIRED_MESSAGE, /Overview/);
});

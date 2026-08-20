import assert from "node:assert/strict";
import test from "node:test";
import {
  parseComplianceChecklist,
  selectedComplianceChecks,
} from "./checklist.ts";

test("parseComplianceChecklist keeps unique non-empty strings", () => {
  assert.deepEqual(parseComplianceChecklist(["A", "A", "", 1, "B"]), [
    "A",
    "B",
  ]);
  assert.deepEqual(parseComplianceChecklist(null), []);
  assert.deepEqual(parseComplianceChecklist({}), []);
});

test("selectedComplianceChecks keeps process order and drops unknown items", () => {
  assert.deepEqual(
    selectedComplianceChecks(
      ["Confirm identities", "Confirm quantity", "Quota is reserved"],
      ["Quota is reserved", "extra", "Confirm identities"],
    ),
    ["Confirm identities", "Quota is reserved"],
  );
});

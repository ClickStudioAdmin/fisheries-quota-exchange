import assert from "node:assert/strict";
import test from "node:test";
import {
  enabledJurisdictionCodesFromForm,
  isSelectableJurisdictionCode,
  organisationEnablesJurisdiction,
  parseEnabledJurisdictionCodes,
  sortJurisdictionsForSelect,
} from "./enabled-jurisdictions.ts";

test("only Queensland is selectable in this phase", () => {
  assert.equal(isSelectableJurisdictionCode("QLD"), true);
  assert.equal(isSelectableJurisdictionCode("CTH"), false);
  assert.equal(isSelectableJurisdictionCode("NSW"), false);
});

test("parseEnabledJurisdictionCodes keeps unique uppercase codes", () => {
  assert.deepEqual(parseEnabledJurisdictionCodes(["qld", "QLD", " NSW ", ""]), [
    "QLD",
    "NSW",
  ]);
  assert.deepEqual(parseEnabledJurisdictionCodes(null), []);
});

test("enabledJurisdictionCodesFromForm drops codes that cannot be selected yet", () => {
  const form = new FormData();
  form.append("jurisdiction_code", "QLD");
  form.append("jurisdiction_code", "CTH");
  assert.deepEqual(enabledJurisdictionCodesFromForm(form), ["QLD"]);
});

test("organisationEnablesJurisdiction reads the stored list", () => {
  assert.equal(organisationEnablesJurisdiction(["QLD"], "QLD"), true);
  assert.equal(organisationEnablesJurisdiction([], "QLD"), false);
  assert.equal(organisationEnablesJurisdiction(undefined, "QLD"), false);
});

test("sortJurisdictionsForSelect puts Queensland first, then NSW, states, Commonwealth last", () => {
  const sorted = sortJurisdictionsForSelect([
    { code: "CTH", name: "Commonwealth of Australia" },
    { code: "WA", name: "Western Australia" },
    { code: "NSW", name: "New South Wales" },
    { code: "QLD", name: "Queensland" },
    { code: "VIC", name: "Victoria" },
  ]);

  assert.deepEqual(
    sorted.map((item) => item.code),
    ["QLD", "NSW", "VIC", "WA", "CTH"],
  );
});

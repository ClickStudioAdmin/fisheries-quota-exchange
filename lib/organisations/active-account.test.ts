import assert from "node:assert/strict";
import test from "node:test";
import {
  afterAccountSelectionPath,
  isInvitationPath,
  parseActiveOrganisationId,
  pathRequiresActiveOrganisation,
  resolveActiveOrganisation,
  selectAccountPath,
} from "./active-account.ts";

test("parseActiveOrganisationId accepts positive integers", () => {
  assert.equal(parseActiveOrganisationId("12"), 12);
  assert.equal(parseActiveOrganisationId("0"), null);
  assert.equal(parseActiveOrganisationId("abc"), null);
  assert.equal(parseActiveOrganisationId(undefined), null);
});

test("one membership binds that organisation", () => {
  const result = resolveActiveOrganisation([7], null);
  assert.deepEqual(result, {
    selectedId: 7,
    bindId: 7,
    needsSelection: false,
    clearCookie: false,
  });
});

test("many memberships require a matching cookie", () => {
  assert.equal(resolveActiveOrganisation([2, 9], null).needsSelection, true);
  assert.equal(resolveActiveOrganisation([2, 9], 9).selectedId, 9);
  assert.equal(resolveActiveOrganisation([2, 9], 4).needsSelection, true);
  assert.equal(resolveActiveOrganisation([2, 9], 4).clearCookie, true);
});

test("removed membership clears a stale cookie", () => {
  const none = resolveActiveOrganisation([], 3);
  assert.equal(none.selectedId, null);
  assert.equal(none.clearCookie, true);
});

test("pathRequiresActiveOrganisation covers member trading surfaces", () => {
  assert.equal(pathRequiresActiveOrganisation("/dashboard/holdings"), true);
  assert.equal(pathRequiresActiveOrganisation("/orders/12"), true);
  assert.equal(pathRequiresActiveOrganisation("/organisations/3/listings/new"), true);
  assert.equal(pathRequiresActiveOrganisation("/select-account"), false);
  assert.equal(pathRequiresActiveOrganisation("/invitations/abc"), false);
  assert.equal(pathRequiresActiveOrganisation("/marketplace/4"), false);
  assert.equal(pathRequiresActiveOrganisation("/admin"), false);
});

test("isInvitationPath matches invitation accept URLs", () => {
  assert.equal(isInvitationPath("/invitations/token"), true);
  assert.equal(isInvitationPath("/invitations"), true);
  assert.equal(isInvitationPath("/dashboard"), false);
});

test("selectAccountPath and afterAccountSelectionPath stay on-site", () => {
  assert.equal(selectAccountPath("/orders/3"), "/select-account?next=%2Forders%2F3");
  assert.equal(afterAccountSelectionPath("/orders/3"), "/orders/3");
  assert.equal(
    afterAccountSelectionPath("/invitations/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
    "/invitations/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
  assert.equal(afterAccountSelectionPath("/login"), "/dashboard");
  assert.equal(afterAccountSelectionPath("https://evil.test"), "/dashboard");
});

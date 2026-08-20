import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddMember,
  canAssignRole,
  canBuyForOrganisation,
  canCancelInvitation,
  canEditOrganisation,
} from "./permissions.ts";

test("owners and admins can buy, bid, and pay", () => {
  assert.equal(canBuyForOrganisation("OWNER"), true);
  assert.equal(canBuyForOrganisation("ADMIN"), true);
  assert.equal(canBuyForOrganisation("MEMBER"), false);
  assert.equal(canBuyForOrganisation("MEMBER"), canEditOrganisation("MEMBER"));
});

test("owners and admins can invite", () => {
  assert.equal(canAddMember("OWNER"), true);
  assert.equal(canAddMember("ADMIN"), true);
  assert.equal(canAddMember("MEMBER"), false);
});

test("admins cannot invite an owner", () => {
  assert.equal(canAssignRole("OWNER", "OWNER"), true);
  assert.equal(canAssignRole("ADMIN", "OWNER"), false);
  assert.equal(canAssignRole("ADMIN", "MEMBER"), true);
});

test("admins cannot cancel an owner invitation", () => {
  assert.equal(canCancelInvitation("OWNER", "OWNER"), true);
  assert.equal(canCancelInvitation("ADMIN", "OWNER"), false);
  assert.equal(canCancelInvitation("ADMIN", "MEMBER"), true);
  assert.equal(canCancelInvitation("MEMBER", "MEMBER"), false);
});

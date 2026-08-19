import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddMember,
  canAssignRole,
  canCancelInvitation,
} from "./permissions.ts";

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

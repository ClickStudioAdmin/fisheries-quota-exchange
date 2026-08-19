import assert from "node:assert/strict";
import test from "node:test";
import { invitationPath, isInvitationToken } from "./paths.ts";

test("isInvitationToken requires 64 hex characters", () => {
  const token = "a".repeat(64);
  assert.equal(isInvitationToken(token), true);
  assert.equal(isInvitationToken(token.toUpperCase()), true);
  assert.equal(isInvitationToken("abc"), false);
  assert.equal(isInvitationToken(`${token}a`), false);
  assert.equal(invitationPath(` ${token} `), `/invitations/${token}`);
});

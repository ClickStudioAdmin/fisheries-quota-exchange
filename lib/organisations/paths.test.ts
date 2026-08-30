import assert from "node:assert/strict";
import test from "node:test";
import { accountPaymentsPath, accountSettingsPath, invitationPath, isInvitationToken } from "./paths.ts";

test("isInvitationToken requires 64 hex characters", () => {
  const token = "a".repeat(64);
  assert.equal(isInvitationToken(token), true);
  assert.equal(isInvitationToken(token.toUpperCase()), true);
  assert.equal(isInvitationToken("abc"), false);
  assert.equal(isInvitationToken(`${token}a`), false);
  assert.equal(invitationPath(` ${token} `), `/invitations/${token}`);
});

test("accountSettingsPath uses Business Settings tabs", () => {
  assert.equal(accountSettingsPath(), "/dashboard/account");
  assert.equal(accountSettingsPath("details"), "/dashboard/account");
  assert.equal(accountSettingsPath("members"), "/dashboard/account?tab=members");
  assert.equal(accountSettingsPath("privileges"), "/dashboard/account?tab=privileges");
  assert.equal(accountSettingsPath("payments"), "/dashboard/account?tab=payments");
  assert.equal(accountSettingsPath("notifications"), "/dashboard/account?tab=notifications");
  assert.equal(accountPaymentsPath(1), "/dashboard/account?tab=payments");
});

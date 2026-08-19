import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddMember,
  canAssignRole,
  canCancelInvitation,
  canChangeMemberRole,
  canEditOrganisation,
  canRemoveMember,
} from "./permissions.ts";
import {
  ORGANISATION_PRIVILEGE_GROUPS,
  privilegeAllows,
  privilegeRowById,
} from "./privileges.ts";
import { ORGANISATION_ROLES } from "./types.ts";

function row(id: string) {
  const found = privilegeRowById(id);
  assert.ok(found, `missing privilege row ${id}`);
  return found;
}

test("privilege catalogue covers every role cell", () => {
  assert.ok(ORGANISATION_PRIVILEGE_GROUPS.length > 0);
  for (const group of ORGANISATION_PRIVILEGE_GROUPS) {
    assert.ok(group.rows.length > 0, group.label);
    for (const item of group.rows) {
      for (const role of ORGANISATION_ROLES) {
        assert.equal(typeof item.cells[role], "string");
        assert.notEqual(item.cells[role], "");
      }
    }
  }
});

test("members can buy and bid but cannot list or manage the business", () => {
  assert.equal(privilegeAllows(row("buy"), "MEMBER"), true);
  assert.equal(privilegeAllows(row("bid"), "MEMBER"), true);
  assert.equal(privilegeAllows(row("pay"), "MEMBER"), true);
  assert.equal(privilegeAllows(row("cancel_unpaid_order"), "MEMBER"), true);
  assert.equal(privilegeAllows(row("view"), "MEMBER"), true);
  assert.equal(privilegeAllows(row("manage_listings"), "MEMBER"), false);
  assert.equal(privilegeAllows(row("manage_holdings"), "MEMBER"), false);
  assert.equal(privilegeAllows(row("payments_setup"), "MEMBER"), false);
  assert.equal(privilegeAllows(row("edit_details"), "MEMBER"), false);
  assert.equal(privilegeAllows(row("invite_admin_or_member"), "MEMBER"), false);
});

test("admins can sell and invite members, not owners or role changes", () => {
  assert.equal(privilegeAllows(row("manage_listings"), "ADMIN"), true);
  assert.equal(privilegeAllows(row("manage_holdings"), "ADMIN"), true);
  assert.equal(privilegeAllows(row("payments_setup"), "ADMIN"), true);
  assert.equal(privilegeAllows(row("invite_admin_or_member"), "ADMIN"), true);
  assert.equal(privilegeAllows(row("invite_owner"), "ADMIN"), false);
  assert.equal(privilegeAllows(row("change_role"), "ADMIN"), false);
  assert.equal(privilegeAllows(row("remove_owner_or_admin"), "ADMIN"), false);
  assert.equal(row("cancel_invitation").cells.ADMIN, "Yes, except Owner invites");
});

test("privilege cells follow the permission helpers", () => {
  for (const role of ORGANISATION_ROLES) {
    assert.equal(
      privilegeAllows(row("edit_details"), role),
      canEditOrganisation(role),
    );
    assert.equal(
      privilegeAllows(row("payments_setup"), role),
      canEditOrganisation(role),
    );
    assert.equal(
      privilegeAllows(row("manage_listings"), role),
      canEditOrganisation(role),
    );
    assert.equal(privilegeAllows(row("invite_admin_or_member"), role), canAddMember(role));
    assert.equal(
      privilegeAllows(row("invite_owner"), role),
      canAssignRole(role, "OWNER"),
    );
    assert.equal(
      privilegeAllows(row("change_role"), role),
      canChangeMemberRole(role),
    );
    assert.equal(
      privilegeAllows(row("remove_member"), role),
      canRemoveMember(role, "MEMBER", false, 2),
    );
    assert.equal(
      privilegeAllows(row("remove_owner_or_admin"), role),
      canRemoveMember(role, "ADMIN", false, 2),
    );
    assert.equal(
      privilegeAllows(row("cancel_invitation"), role),
      canCancelInvitation(role, "MEMBER"),
    );
  }

  assert.equal(row("leave").cells.OWNER, "Yes, unless last owner");
});

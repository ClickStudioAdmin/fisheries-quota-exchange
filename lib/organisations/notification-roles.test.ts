import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_NOTIFICATION_ROLES,
  notificationRolesFromForm,
  parseNotificationRoles,
} from "./notification-roles.ts";

test("parseNotificationRoles keeps a stable Owner Admin Member order", () => {
  assert.deepEqual(parseNotificationRoles(["MEMBER", "OWNER"]), [
    "OWNER",
    "MEMBER",
  ]);
  assert.deepEqual(parseNotificationRoles([]), DEFAULT_NOTIFICATION_ROLES);
  assert.deepEqual(parseNotificationRoles(null), DEFAULT_NOTIFICATION_ROLES);
});

test("notificationRolesFromForm requires listed roles", () => {
  const empty = new FormData();
  assert.deepEqual(notificationRolesFromForm(empty), []);

  const form = new FormData();
  form.append("notification_role", "ADMIN");
  form.append("notification_role", "MEMBER");
  form.append("notification_role", "ADMIN");
  assert.deepEqual(notificationRolesFromForm(form), ["ADMIN", "MEMBER"]);
});

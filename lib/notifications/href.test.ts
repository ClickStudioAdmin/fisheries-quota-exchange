import assert from "node:assert/strict";
import test from "node:test";
import { inAppNotificationHref, safeAppPath } from "./href.ts";

test("inAppNotificationHref keeps app paths from action URLs", () => {
  assert.equal(inAppNotificationHref("/orders/12"), "/orders/12");
  assert.equal(
    inAppNotificationHref("https://example.test/orders/12?tab=pay"),
    "/orders/12?tab=pay",
  );
  assert.equal(inAppNotificationHref("https://evil.test"), "/");
  assert.equal(inAppNotificationHref("//evil.test"), "/dashboard/notifications");
  assert.equal(inAppNotificationHref(""), "/dashboard/notifications");
});

test("safeAppPath rejects off-site redirects", () => {
  assert.equal(safeAppPath("/dashboard/holdings/1"), "/dashboard/holdings/1");
  assert.equal(safeAppPath("https://example.test/x"), "/dashboard/notifications");
  assert.equal(safeAppPath("//example.test"), "/dashboard/notifications");
});

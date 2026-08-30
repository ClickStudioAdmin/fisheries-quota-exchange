import assert from "node:assert/strict";
import test from "node:test";
import { inAppNotificationHref, inAppNotificationLinkLabel, safeAppPath } from "./href.ts";

test("inAppNotificationHref keeps app paths from action URLs", () => {
  assert.equal(inAppNotificationHref("/invitations/abc"), "/invitations/abc");
  assert.equal(
    inAppNotificationHref(
      "https://example.test/invitations/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ),
    "/invitations/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
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

test("inAppNotificationLinkLabel follows the notice destination", () => {
  assert.equal(
    inAppNotificationLinkLabel("listing_published", "/marketplace/12"),
    "View listing",
  );
  assert.equal(
    inAppNotificationLinkLabel("listing_alert", "/auctions/12"),
    "View auction",
  );
  assert.equal(
    inAppNotificationLinkLabel("holding_verified", "/dashboard/holdings/3"),
    "View holding",
  );
  assert.equal(
    inAppNotificationLinkLabel("order_settled", "/orders/1001"),
    "View order",
  );
  assert.equal(
    inAppNotificationLinkLabel("purchase_received", "/orders/1001"),
    "Pay FQX",
  );
  assert.equal(
    inAppNotificationLinkLabel("member_added", "/invitations/abc"),
    "Accept invitation",
  );
  assert.equal(
    inAppNotificationLinkLabel(
      "payments_setup_complete",
      "/dashboard/account?tab=payments",
    ),
    "Business Settings",
  );
});

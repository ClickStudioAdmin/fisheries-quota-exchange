import assert from "node:assert/strict";
import test from "node:test";
import {
  currentSideNavLabel,
  sideNavBadgeTotal,
  type SideNavItem,
} from "./side-nav.ts";

const items: SideNavItem[] = [
  {
    heading: "You",
    items: [
      { href: "/dashboard/profile", label: "Account Settings" },
      { href: "/dashboard/notifications", label: "Inbox", badge: 2 },
    ],
  },
  {
    heading: "This business",
    items: [
      { href: "/dashboard", label: "Overview", badge: 1 },
      {
        href: "/dashboard/orders",
        label: "Orders",
        alsoMatch: ["/orders"],
        badge: 1,
      },
    ],
  },
];

test("currentSideNavLabel uses Orders for an order page", () => {
  assert.equal(
    currentSideNavLabel(items, "/orders/3634", null, "Dashboard"),
    "Orders",
  );
});

test("sideNavBadgeTotal sums every link badge", () => {
  assert.equal(sideNavBadgeTotal(items), 4);
});

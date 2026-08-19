import type { ReactNode } from "react";
import { AreaShell } from "@/components/area-shell";
import type { SideNavItem } from "@/components/side-nav";
import { getMemberActionCounts } from "@/lib/nav/action-counts";
import { getMyUnreadNotificationCount } from "@/lib/notifications/queries";
import { selectAccountPath, resolveActiveOrganisation } from "@/lib/organisations/active-account";
import { readActiveOrganisationCookie } from "@/lib/organisations/active-session";
import { listMyOrganisations } from "@/lib/organisations/queries";

export async function MemberArea({ children }: { children: ReactNode }) {
  const [organisations, counts, unreadNotifications, cookieId] = await Promise.all([
    listMyOrganisations(),
    getMemberActionCounts(),
    getMyUnreadNotificationCount(),
    readActiveOrganisationCookie(),
  ]);
  const resolved = resolveActiveOrganisation(
    organisations.map((organisation) => organisation.id),
    cookieId,
  );
  const active = organisations.find(
    (organisation) => organisation.id === resolved.selectedId,
  );

  const items: SideNavItem[] = [
    {
      heading: "You",
      items: [
        { href: "/dashboard/profile", label: "Profile" },
        {
          href: "/dashboard/notifications",
          label: "Inbox",
          badge: unreadNotifications,
        },
      ],
    },
    {
      heading: "This account",
      items: [
        { href: "/dashboard", label: "Overview" },
        { href: "/dashboard/account", label: "Account Settings" },
        {
          href: "/dashboard/holdings",
          label: "Quota Holdings",
          match: "prefix",
          alsoMatch: ["auctions"],
          badge: counts.holdings,
        },
        {
          href: "/dashboard/listings",
          label: "Listings",
          alsoMatch: ["listings"],
          badge: counts.listings,
        },
        {
          href: "/dashboard/orders",
          label: "Orders",
          alsoMatch: ["/orders"],
          badge: counts.orders,
        },
      ],
    },
  ];

  return (
    <AreaShell
      title="Dashboard"
      operatingAs={active?.legal_name ?? null}
      switchAccountHref={
        organisations.length > 1 ? selectAccountPath() : null
      }
      items={items}
    >
      {children}
    </AreaShell>
  );
}

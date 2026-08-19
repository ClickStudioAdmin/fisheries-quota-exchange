import type { ReactNode } from "react";
import { AreaShell } from "@/components/area-shell";
import type { SideNavLink } from "@/components/side-nav";
import { getMemberActionCounts } from "@/lib/nav/action-counts";
import { getMyUnreadNotificationCount } from "@/lib/notifications/queries";
import { resolveActiveOrganisation } from "@/lib/organisations/active-account";
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

  const sectionItems: SideNavLink[] = [
    { href: "/dashboard", label: "Overview" },
    {
      href: "/dashboard/notifications",
      label: "Notifications",
      badge: unreadNotifications,
    },
    { href: "/dashboard/alerts", label: "Listing Alerts" },
    { href: "/dashboard/profile", label: "Account Details" },
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
  ];

  return (
    <AreaShell
      title="Account"
      operatingAs={active?.legal_name ?? null}
      items={sectionItems}
    >
      {children}
    </AreaShell>
  );
}

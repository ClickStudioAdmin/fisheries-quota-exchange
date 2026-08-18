import type { ReactNode } from "react";
import { AreaShell } from "@/components/area-shell";
import type { SideNavLink } from "@/components/side-nav";
import { getMemberActionCounts } from "@/lib/nav/action-counts";
import { accountPath } from "@/lib/organisations/paths";
import { listMyOrganisations } from "@/lib/organisations/queries";

export async function MemberArea({ children }: { children: ReactNode }) {
  const [organisations, counts] = await Promise.all([
    listMyOrganisations(),
    getMemberActionCounts(),
  ]);
  const defaultAccount =
    organisations.find((organisation) => organisation.role === "OWNER") ??
    organisations[0];

  const accountItems: SideNavLink[] =
    organisations.length > 1
      ? organisations.map((organisation) => ({
          href: accountPath(organisation.id),
          label: organisation.legal_name,
          accountId: organisation.id,
          isDefault: organisation.id === defaultAccount?.id,
          badge: counts.byOrganisation[organisation.id] ?? 0,
        }))
      : [];

  const sectionItems: SideNavLink[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/profile", label: "Profile details" },
    { href: "/dashboard/notifications", label: "Notifications" },
    { href: "/dashboard/alerts", label: "Alerts" },
    { href: "/dashboard/members", label: "Account members" },
    {
      href: "/dashboard/holdings",
      label: "Quota holdings",
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
    { href: "/dashboard/payments", label: "Payments" },
  ];

  return (
    <AreaShell title="Account" items={[...accountItems, ...sectionItems]}>
      {children}
    </AreaShell>
  );
}

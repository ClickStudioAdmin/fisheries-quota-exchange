import type { ReactNode } from "react";
import { AreaShell } from "@/components/area-shell";
import type { SideNavLink } from "@/components/side-nav";
import { accountPath } from "@/lib/organisations/paths";
import { listMyOrganisations } from "@/lib/organisations/queries";

const sectionItems: SideNavLink[] = [
  { href: "/dashboard", label: "Profile details" },
  { href: "/dashboard/members", label: "Account members" },
  {
    href: "/dashboard/holdings",
    label: "Quota holdings",
    match: "prefix",
    alsoMatch: ["auctions"],
  },
  {
    href: "/dashboard/listings",
    label: "Listings",
    alsoMatch: ["listings"],
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    alsoMatch: ["/orders"],
  },
];

export async function MemberArea({ children }: { children: ReactNode }) {
  const organisations = await listMyOrganisations();
  const defaultAccount =
    organisations.find((organisation) => organisation.role === "OWNER") ??
    organisations[0];

  const accountItems =
    organisations.length > 1
      ? organisations.map((organisation) => ({
          href: accountPath(organisation.id),
          label: organisation.legal_name,
          accountId: organisation.id,
          isDefault: organisation.id === defaultAccount?.id,
        }))
      : [];

  return (
    <AreaShell title="Account" items={[...accountItems, ...sectionItems]}>
      {children}
    </AreaShell>
  );
}

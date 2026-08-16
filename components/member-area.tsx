import type { ReactNode } from "react";
import { AreaShell } from "@/components/area-shell";
import { listMyOrganisations } from "@/lib/organisations/queries";

export async function MemberArea({ children }: { children: ReactNode }) {
  const organisations = await listMyOrganisations();

  return (
    <AreaShell
      title="Dashboard"
      items={[
        { href: "/dashboard", label: "Overview" },
        ...organisations.map((organisation) => ({
          href: `/organisations/${organisation.id}`,
          label: organisation.legal_name,
          match: "prefix" as const,
        })),
        { href: "/organisations/new", label: "Create organisation" },
      ]}
    >
      {children}
    </AreaShell>
  );
}

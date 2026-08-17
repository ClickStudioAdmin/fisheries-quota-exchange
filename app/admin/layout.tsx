import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AreaShell } from "@/components/area-shell";
import type { SideNavItem } from "@/components/side-nav";
import { pageWidthClassName } from "@/components/surface";
import { canSeeAdmin, isPlatformAdmin } from "@/lib/admin/access";
import { getAdminActionCounts } from "@/lib/nav/action-counts";
import { getUser } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (!(await canSeeAdmin())) {
    redirect("/dashboard");
  }

  const admin = await isPlatformAdmin();

  if (!admin) {
    return (
      <div className={`${pageWidthClassName} py-12`}>{children}</div>
    );
  }

  const counts = await getAdminActionCounts();
  const links: SideNavItem[] = [
    { href: "/admin", label: "Overview" },
    {
      href: "/admin/users",
      label: "Users",
      match: "prefix",
    },
    {
      href: "/admin/holdings",
      label: "Holdings",
      match: "prefix",
      badge: counts.holdings,
    },
    {
      href: "/admin/listings",
      label: "Listings",
      match: "prefix",
      badge: counts.listings,
    },
    {
      href: "/admin/orders",
      label: "Orders",
      match: "prefix",
      badge: counts.orders,
    },
    {
      label: "Reference data",
      children: [
        { href: "/admin/reference/jurisdictions", label: "Jurisdictions" },
        {
          href: "/admin/reference/fisheries",
          label: "Fisheries",
          match: "prefix",
        },
      ],
    },
  ];

  return (
    <AreaShell title="Admin" items={links}>
      {children}
    </AreaShell>
  );
}

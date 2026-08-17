import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AreaShell } from "@/components/area-shell";
import type { SideNavItem } from "@/components/side-nav";
import { canSeeAdmin, isPlatformAdmin } from "@/lib/admin/access";
import { getUser } from "@/lib/supabase/server";

const links: SideNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users", match: "prefix" },
  { href: "/admin/holdings", label: "Holdings", match: "prefix" },
  { href: "/admin/listings", label: "Listings", match: "prefix" },
  { href: "/admin/orders", label: "Orders", match: "prefix" },
  {
    label: "Reference data",
    children: [
      { href: "/admin/reference/jurisdictions", label: "Jurisdictions" },
      { href: "/admin/reference/fisheries", label: "Fisheries", match: "prefix" },
    ],
  },
];

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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">{children}</div>
    );
  }

  return (
    <AreaShell title="Admin" items={links}>
      {children}
    </AreaShell>
  );
}

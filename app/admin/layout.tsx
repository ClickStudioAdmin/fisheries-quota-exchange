import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AreaShell } from "@/components/area-shell";
import { canSeeAdmin, isPlatformAdmin } from "@/lib/admin/access";
import { getUser } from "@/lib/supabase/server";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reference", label: "Reference data", match: "prefix" as const },
  { href: "/admin/fisheries", label: "Fisheries", match: "prefix" as const },
  { href: "/admin/holdings", label: "Holdings", match: "prefix" as const },
  { href: "/admin/listings", label: "Listings", match: "prefix" as const },
  { href: "/admin/orders", label: "Orders", match: "prefix" as const },
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

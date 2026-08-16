import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canSeeAdmin, isPlatformAdmin } from "@/lib/admin/access";
import { getUser } from "@/lib/supabase/server";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reference", label: "Reference data" },
  { href: "/admin/fisheries", label: "Fisheries" },
  { href: "/admin/holdings", label: "Holdings" },
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
        Platform admin
      </p>
      {admin ? (
        <nav aria-label="Admin" className="mt-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="mt-8">{children}</div>
    </div>
  );
}

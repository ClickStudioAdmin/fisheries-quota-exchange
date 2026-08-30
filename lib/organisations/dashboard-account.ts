import { redirect } from "next/navigation";
import { listMyOrganisations } from "@/lib/organisations/queries";
import { resolveActiveOrganisation, selectAccountPath } from "@/lib/organisations/active-account";
import { readActiveOrganisationCookie } from "@/lib/organisations/active-session";
import { loginPath } from "@/lib/auth/paths";
import { getUser } from "@/lib/supabase/server";
import type { OrganisationSummary } from "@/lib/organisations/types";
import type { User } from "@supabase/supabase-js";

export type DashboardAccount =
  | {
      user: User;
      needsSetup: true;
      organisations: OrganisationSummary[];
      selected: null;
    }
  | {
      user: User;
      needsSetup: false;
      organisations: OrganisationSummary[];
      selected: OrganisationSummary;
    };

export async function requireDashboardUser(currentPath: string) {
  const user = await getUser();

  if (!user?.email) {
    redirect(loginPath(currentPath));
  }

  return user;
}

export async function resolveDashboardAccount(
  currentPath: string,
): Promise<DashboardAccount> {
  const user = await getUser();

  if (!user?.email) {
    redirect(loginPath(currentPath));
  }

  const organisations = await listMyOrganisations();
  const cookieId = await readActiveOrganisationCookie();
  const resolved = resolveActiveOrganisation(
    organisations.map((organisation) => organisation.id),
    cookieId,
  );

  if (!resolved.selectedId) {
    if (resolved.needsSelection) {
      redirect(selectAccountPath(currentPath));
    }

    if (
      currentPath !== "/dashboard" &&
      currentPath !== "/dashboard/profile" &&
      currentPath !== "/dashboard/account" &&
      currentPath !== "/dashboard/notifications"
    ) {
      redirect("/dashboard");
    }

    return {
      user,
      needsSetup: true,
      organisations,
      selected: null,
    };
  }

  const selected = organisations.find(
    (organisation) => organisation.id === resolved.selectedId,
  );

  if (!selected) {
    redirect(selectAccountPath(currentPath));
  }

  return {
    user,
    needsSetup: false,
    organisations,
    selected,
  };
}

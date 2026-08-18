import { redirect } from "next/navigation";
import { listMyOrganisations } from "@/lib/organisations/queries";
import { accountPath } from "@/lib/organisations/paths";
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
  accountParam: string | undefined,
  currentPath: string,
): Promise<DashboardAccount> {
  const user = await getUser();

  if (!user?.email) {
    redirect(loginPath(currentPath));
  }

  const organisations = await listMyOrganisations();
  const requestedId = Number(accountParam);
  const defaultAccount =
    organisations.find((organisation) => organisation.role === "OWNER") ??
    organisations[0];

  if (!defaultAccount) {
    if (
      currentPath !== "/dashboard" &&
      currentPath !== "/dashboard/profile"
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

  const selected =
    organisations.find((organisation) => organisation.id === requestedId) ??
    defaultAccount;

  if (
    organisations.length > 1 &&
    (!Number.isInteger(requestedId) || selected.id !== requestedId)
  ) {
    redirect(accountPath(selected.id, currentPath));
  }

  return {
    user,
    needsSetup: false,
    organisations,
    selected,
  };
}

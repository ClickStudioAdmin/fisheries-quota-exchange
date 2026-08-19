import { redirect } from "next/navigation";
import { AuthCard, authButtonClassName } from "@/components/auth-card";
import {
  afterAccountSelectionPath,
} from "@/lib/organisations/active-account";
import { readActiveOrganisationCookie } from "@/lib/organisations/active-session";
import { selectAccountAction } from "@/lib/organisations/select-account";
import { listMyOrganisations } from "@/lib/organisations/queries";
import { organisationRoleLabel } from "@/lib/organisations/types";
import { loginPath } from "@/lib/auth/paths";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Choose a business",
};

export default async function SelectAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect(loginPath());
  }

  const params = await searchParams;
  const next = afterAccountSelectionPath(params.next);
  const organisations = await listMyOrganisations();

  if (organisations.length === 0) {
    redirect("/dashboard");
  }

  if (organisations.length === 1) {
    redirect(next);
  }

  const activeId = await readActiveOrganisationCookie();

  return (
    <AuthCard title="Choose a business">
      <p className="mb-6 text-sm text-ink-muted">
        You belong to more than one business. Everything you do on FQX uses
        the business you choose here until you switch.
      </p>
      <ul className="space-y-3">
        {organisations.map((organisation) => (
          <li key={organisation.id}>
            <form action={selectAccountAction}>
              <input
                type="hidden"
                name="organisation_id"
                value={organisation.id}
              />
              <input type="hidden" name="next" value={next} />
              <button type="submit" className={`${authButtonClassName} text-left`}>
                <span className="block">{organisation.legal_name}</span>
                <span className="mt-1 block text-xs font-normal opacity-80">
                  {organisationRoleLabel(organisation.role)}
                  {organisation.id === activeId ? " · current" : ""}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </AuthCard>
  );
}

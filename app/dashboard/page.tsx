import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { buttonClassName } from "@/components/auth-card";
import { PageIntro } from "@/components/page-intro";
import { listMyOrganisations } from "@/lib/organisations/queries";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const organisations = await listMyOrganisations();

  return (
    <PageIntro title="Dashboard">
      <p>Signed in as {user.email}.</p>
      <p>
        <Link href="/organisations/new" className={buttonClassName}>
          Create organisation
        </Link>
      </p>
      {organisations.length === 0 ? (
        <p>You do not belong to an organisation yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border border-line">
          {organisations.map((organisation) => (
            <li key={organisation.id}>
              <Link
                href={`/organisations/${organisation.id}`}
                className="block px-4 py-3 hover:bg-paper-raised"
              >
                <span className="block text-ink">{organisation.legal_name}</span>
                <span className="block text-sm text-ink-muted">
                  {organisation.role}
                  {organisation.trading_name
                    ? ` · ${organisation.trading_name}`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <form action={logoutAction} className="mt-8">
        <button
          type="submit"
          className="border border-line px-4 py-2 text-sm text-ink hover:bg-paper-raised"
        >
          Log out
        </button>
      </form>
    </PageIntro>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddMemberForm } from "@/components/add-member-form";
import { MemberList } from "@/components/member-list";
import { OrganisationProfileForm } from "@/components/organisation-profile-form";
import { canAddMember, canEditOrganisation } from "@/lib/organisations/permissions";
import {
  getOrganisation,
  listMembers,
} from "@/lib/organisations/queries";
import {
  listAllQuotaTypes,
  listAllSeasons,
  listAllStocks,
  listHoldingsForOrganisation,
  listLedger,
} from "@/lib/fisheries/queries";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Organisation",
};

export default async function OrganisationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { id } = await params;
  const organisationId = Number(id);

  if (!Number.isInteger(organisationId)) {
    notFound();
  }

  const result = await getOrganisation(organisationId);

  if (!result) {
    notFound();
  }

  const members = await listMembers(organisationId);
  const canEdit = canEditOrganisation(result.role);
  const canInvite = canAddMember(result.role);
  const [holdings, stocks, seasons, quotaTypes] = await Promise.all([
    listHoldingsForOrganisation(organisationId),
    listAllStocks(),
    listAllSeasons(),
    listAllQuotaTypes(),
  ]);
  const holdingLedgers = await Promise.all(
    holdings.map(async (holding) => ({
      holding,
      entries: await listLedger(holding.id),
    })),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm text-ink-muted">
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>
        <span> · Your role: {result.role}</span>
      </p>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {result.organisation.legal_name}
        </h1>
        <div className="mt-6 max-w-md">
          <OrganisationProfileForm
            organisation={result.organisation}
            canEdit={canEdit}
          />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">Members</h2>
        <div className="mt-4">
          <MemberList
            organisationId={organisationId}
            members={members}
            actorRole={result.role}
            actorEmail={user.email}
          />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">Quota holdings</h2>
        {holdingLedgers.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No holdings yet. A platform admin can create a test holding.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {holdingLedgers.map(({ holding, entries }) => {
              const stock = stocks.find((item) => item.id === holding.stock_id);
              const season = seasons.find((item) => item.id === holding.season_id);
              const quotaType = quotaTypes.find(
                (item) => item.id === holding.quota_type_id,
              );
              return (
                <div key={holding.id} className="border border-line p-4">
                  <p className="text-ink">
                    {stock?.name ?? "Stock"} · {season?.name ?? "Season"} ·{" "}
                    {holding.quantity} {quotaType?.unit_label ?? ""}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {quotaType
                      ? `${quotaType.name} (${quotaType.measurement_kind})`
                      : "Quota type"}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                    {entries.map((entry) => (
                      <li key={entry.id}>
                        {entry.event_type}: {entry.quantity_delta} →{" "}
                        {entry.quantity_after}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {canInvite ? (
        <section className="max-w-md">
          <h2 className="text-xl font-semibold text-ink">Add member</h2>
          <p className="mt-2 text-sm text-ink-muted">
            They can sign in with this email to access the organisation. No
            invitation email is sent yet.
          </p>
          <div className="mt-4">
            <AddMemberForm
              organisationId={organisationId}
              actorRole={result.role}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

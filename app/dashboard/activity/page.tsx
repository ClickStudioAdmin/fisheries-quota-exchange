import { ActivityLog } from "@/components/activity-log";
import { listAuditPersonNames, listOrganisationAuditEvents } from "@/lib/audit/queries";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Activity",
};

export default async function DashboardActivityPage() {
  const account = await resolveDashboardAccount("/dashboard/activity");

  if (account.needsSetup) {
    return null;
  }

  const [events, personNames] = await Promise.all([
    listOrganisationAuditEvents(account.selected.id),
    listAuditPersonNames(account.selected.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Activity
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          What happened for {account.selected.legal_name}, including who did it.
          Filter by category, event, or who. People show as names. Platform
          operators show as FQX.
        </p>
      </div>
      <ActivityLog
        events={events}
        viewer="business"
        organisationId={account.selected.id}
        organisationName={account.selected.legal_name}
        personNames={personNames}
        caption="Business activity"
        empty="No activity recorded yet for this business."
      />
    </div>
  );
}

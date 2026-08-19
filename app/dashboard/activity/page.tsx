import { ActivityLog } from "@/components/activity-log";
import { listOrganisationAuditEvents } from "@/lib/audit/queries";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Activity",
};

export default async function DashboardActivityPage() {
  const account = await resolveDashboardAccount("/dashboard/activity");

  if (account.needsSetup) {
    return null;
  }

  const events = await listOrganisationAuditEvents(account.selected.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Activity
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          What happened for {account.selected.legal_name}, including who did it.
          Filter by category, event, or person.
        </p>
      </div>
      <ActivityLog
        events={events}
        viewer="business"
        caption="Business activity"
        empty="No activity recorded yet for this business."
      />
    </div>
  );
}

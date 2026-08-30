import { redirect } from "next/navigation";
import { ActivityLog } from "@/components/activity-log";
import { isPlatformAdmin } from "@/lib/admin/access";
import { listAuditPersonNames, listPlatformAuditEvents } from "@/lib/audit/queries";

export const metadata = {
  title: "Activity",
};

export default async function AdminActivityPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const [events, personNames] = await Promise.all([
    listPlatformAuditEvents(),
    listAuditPersonNames(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Activity
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Platform and business events, including who did them. People show as
          names, not emails. Filter by category, event, who, or business.
        </p>
      </div>
      <ActivityLog
        events={events}
        viewer="admin"
        personNames={personNames}
        caption="Platform activity"
        empty="No activity recorded yet."
      />
    </div>
  );
}

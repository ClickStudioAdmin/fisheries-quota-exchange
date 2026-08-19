import { redirect } from "next/navigation";
import { ActivityLog } from "@/components/activity-log";
import { isPlatformAdmin } from "@/lib/admin/access";
import { listPlatformAuditEvents } from "@/lib/audit/queries";

export const metadata = {
  title: "Activity",
};

export default async function AdminActivityPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const events = await listPlatformAuditEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Activity
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Platform and business events, including who did them. Filter by
          category, event, person, or business.
        </p>
      </div>
      <ActivityLog
        events={events}
        viewer="admin"
        caption="Platform activity"
        empty="No activity recorded yet."
      />
    </div>
  );
}

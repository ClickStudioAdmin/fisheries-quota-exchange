import { InAppNotificationList } from "@/components/in-app-notification-list";
import { listMyInAppNotifications } from "@/lib/notifications/queries";
import { requireDashboardUser } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Inbox",
};

export default async function DashboardNotificationsPage() {
  await requireDashboardUser("/dashboard/notifications");
  const notifications = await listMyInAppNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Inbox
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Notices sent to you. Turn messages on or off on Profile →
          Notifications and Business Settings → Notifications. Fishery watches
          are on Profile → Alerts.
        </p>
      </div>
      <InAppNotificationList notifications={notifications} />
    </div>
  );
}

import { NotificationSettingsForm } from "@/components/notification-settings-form";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getMyDisabledEmails } from "@/lib/alerts/queries";
import { requireDashboardUser } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Notifications",
};

export default async function DashboardNotificationsPage() {
  await requireDashboardUser("/dashboard/notifications");
  const [disabledEmails, showOperatorEmails] = await Promise.all([
    getMyDisabledEmails(),
    isPlatformAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Notifications
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          These settings apply to your email, not the whole organisation.
          Platform admins can still disable a message for everyone.
        </p>
      </div>
      <NotificationSettingsForm
        disabledEmails={disabledEmails}
        showOperatorEmails={showOperatorEmails}
      />
    </div>
  );
}

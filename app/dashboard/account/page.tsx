import { AccountPaymentsSection } from "@/components/account-payments";
import {
  AccountBusinessSection,
  AccountMembersSection,
  AccountNotificationsSection,
} from "@/components/account-sections";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { accountSettingsPath } from "@/lib/organisations/paths";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";
import { listMembers } from "@/lib/organisations/queries";

export const metadata = {
  title: "Business Settings",
};

export default async function DashboardAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount("/dashboard/account");
  const organisationId = account.selected?.id ?? null;
  const memberCount = organisationId
    ? (await listMembers(organisationId)).length
    : 0;
  const showNotifications = memberCount > 1;
  const tab =
    (params.tab === "members" ||
      params.tab === "payments" ||
      (params.tab === "notifications" && showNotifications))
      ? params.tab
      : "details";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Business Settings
      </h1>
      <DashboardTabs
        label="Business settings sections"
        active={tab}
        items={[
          { id: "details", href: accountSettingsPath(), label: "Details" },
          { id: "members", href: accountSettingsPath("members"), label: "Members" },
          {
            id: "payments",
            href: accountSettingsPath("payments"),
            label: "Payments",
          },
          ...(showNotifications
            ? [
                {
                  id: "notifications",
                  href: accountSettingsPath("notifications"),
                  label: "Notifications",
                },
              ]
            : []),
        ]}
      />
      {tab === "members" ? (
        organisationId ? (
          <AccountMembersSection
            organisationId={organisationId}
            userEmail={account.user.email ?? ""}
          />
        ) : (
          <p className="text-sm text-ink-muted">
            Add your business details on the Details tab before you can manage
            members.
          </p>
        )
      ) : tab === "payments" ? (
        organisationId && account.selected ? (
          <AccountPaymentsSection
            organisationId={organisationId}
            role={account.selected.role}
          />
        ) : (
          <p className="text-sm text-ink-muted">
            Add your business details on the Details tab before connecting
            Stripe payments.
          </p>
        )
      ) : tab === "notifications" ? (
        organisationId ? (
          <AccountNotificationsSection organisationId={organisationId} />
        ) : (
          <p className="text-sm text-ink-muted">
            Add your business details on the Details tab before you can choose
            who receives business email.
          </p>
        )
      ) : (
        <AccountBusinessSection organisationId={organisationId} />
      )}
    </div>
  );
}

import { AccountMembersSection } from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Account members",
};

export default async function DashboardMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(
    params.account,
    "/dashboard/members",
  );

  if (account.needsSetup) {
    return null;
  }

  return (
    <AccountMembersSection
      organisationId={account.selected.id}
      userEmail={account.user.email ?? ""}
    />
  );
}

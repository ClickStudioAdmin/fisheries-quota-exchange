import { AccountHoldingsSection } from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Quota holdings",
};

export default async function DashboardHoldingsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; created?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(
    params.account,
    "/dashboard/holdings",
  );

  if (account.needsSetup) {
    return null;
  }

  return (
    <AccountHoldingsSection
      organisationId={account.selected.id}
      created={params.created}
    />
  );
}

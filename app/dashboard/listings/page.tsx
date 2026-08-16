import { AccountListingsSection } from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Listings",
};

export default async function DashboardListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(
    params.account,
    "/dashboard/listings",
  );

  if (account.needsSetup) {
    return null;
  }

  return <AccountListingsSection organisationId={account.selected.id} />;
}

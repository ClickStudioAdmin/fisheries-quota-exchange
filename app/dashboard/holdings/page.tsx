import { AccountHoldingsSection } from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Quota Holdings",
};

export default async function DashboardHoldingsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; created?: string; listing?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(
    params.account,
    "/dashboard/holdings",
  );

  if (account.needsSetup) {
    return null;
  }

  const listingId = Number(params.listing);

  return (
    <AccountHoldingsSection
      organisationId={account.selected.id}
      created={params.created}
      listingId={Number.isInteger(listingId) ? listingId : undefined}
    />
  );
}

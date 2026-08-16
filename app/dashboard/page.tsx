import { BusinessDetailsForm } from "@/components/business-details-form";
import { AccountProfileSection } from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Profile details",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(params.account, "/dashboard");

  if (account.needsSetup) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Profile details
        </h1>
        <p className="text-ink-muted">
          Add your business details to finish setting up this account. You
          cannot create extra organisations.
        </p>
        <BusinessDetailsForm />
      </div>
    );
  }

  return <AccountProfileSection organisationId={account.selected.id} />;
}

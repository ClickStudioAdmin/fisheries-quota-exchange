import { BusinessDetailsForm } from "@/components/business-details-form";
import { AccountOverviewSection } from "@/components/account-overview";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";

export const metadata = {
  title: "Overview",
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
          Finish account setup
        </h1>
        <p className="text-ink-muted">
          Add your business details to finish setting up this account. You
          cannot create extra organisations.
        </p>
        <BusinessDetailsForm />
      </div>
    );
  }

  return (
    <AccountOverviewSection
      organisationId={account.selected.id}
      user={account.user}
    />
  );
}

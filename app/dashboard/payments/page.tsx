import { PaymentsConnect } from "@/components/payments-connect";
import { panelClassName } from "@/components/surface";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { isPaymentsConfigured, getStripePublishableKey } from "@/lib/payments/env";
import { getOrganisationPaymentStatus } from "@/lib/payments/queries";

export const metadata = {
  title: "Payments",
};

export default async function DashboardPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(
    params.account,
    "/dashboard/payments",
  );

  if (account.needsSetup) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Payments
        </h1>
        <p className="text-ink-muted">
          Add your business details before connecting card payments.
        </p>
      </div>
    );
  }

  const configured = isPaymentsConfigured();
  const publishableKey = getStripePublishableKey();
  const status = await getOrganisationPaymentStatus(account.selected.id);
  const canManage = canEditOrganisation(account.selected.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Payments
        </h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          Buyers pay FQX. Your account is paid out on each successful test
          charge. FQX is responsible for refunds and chargebacks. This is
          Stripe test mode only.
        </p>
      </div>
      {!configured || !publishableKey ? (
        <p className="text-sm text-ink-muted">
          Card payments are not configured. Purchases stay on the simulated
          path until Stripe test keys are set.
        </p>
      ) : (
        <div className={`max-w-2xl space-y-4 ${panelClassName}`}>
          <p className="text-sm text-ink">
            {status?.chargesEnabled
              ? "This account can accept test card payments."
              : "Complete onboarding to accept test card payments on your listings."}
          </p>
          {canManage ? (
            <PaymentsConnect
              organisationId={account.selected.id}
              publishableKey={publishableKey}
              detailsSubmitted={Boolean(status?.detailsSubmitted)}
            />
          ) : (
            <p className="text-sm text-ink-muted">
              Only an owner or admin can connect Stripe for this account.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

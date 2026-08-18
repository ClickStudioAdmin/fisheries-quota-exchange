import { PaymentsConnect } from "@/components/payments-connect";
import { panelClassName } from "@/components/surface";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { isPaymentsConfigured, getStripePublishableKey } from "@/lib/payments/env";
import { refreshOrganisationPaymentStatus } from "@/lib/payments/queries";

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
          Add your business details before connecting Stripe payments.
        </p>
      </div>
    );
  }

  const configured = isPaymentsConfigured();
  const publishableKey = getStripePublishableKey();
  const status = await refreshOrganisationPaymentStatus(account.selected.id);
  const canManage = canEditOrganisation(account.selected.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Payments
        </h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          FQX uses Stripe to process payments. Buyers pay FQX. We hold those
          funds until settlement, then pay the seller. You must complete Stripe
          account setup here before you can list quota for sale or lease. This
          is Stripe test mode only.
        </p>
      </div>
      {!configured || !publishableKey ? (
        <p className="text-sm text-ink-muted">
          Payments are not configured. Purchases stay on the simulated
          path until Stripe test keys are set.
        </p>
      ) : (
        <div className={`max-w-2xl space-y-4 ${panelClassName}`}>
          <p className="text-sm text-ink">
            {status?.chargesEnabled
              ? "This account can receive settlement transfers."
              : status?.detailsSubmitted
                ? "Stripe has your details and is reviewing them. Refresh this page in a minute."
                : "Complete onboarding to receive settlement transfers on your listings."}
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

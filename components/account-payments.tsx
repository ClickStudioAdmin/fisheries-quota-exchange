import { PaymentsConnect } from "@/components/payments-connect";
import { StripeLogo } from "@/components/stripe-logo";
import { ActionNotice } from "@/components/notices";
import { panelClassName } from "@/components/surface";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import type { OrganisationRole } from "@/lib/organisations/types";
import { isPaymentsConfigured, getStripePublishableKey } from "@/lib/payments/env";
import { refreshOrganisationPaymentStatus } from "@/lib/payments/queries";

export async function AccountPaymentsSection({
  organisationId,
  role,
}: {
  organisationId: number;
  role: OrganisationRole;
}) {
  const configured = isPaymentsConfigured();
  const publishableKey = getStripePublishableKey();
  const status = await refreshOrganisationPaymentStatus(organisationId);
  const canManage = canEditOrganisation(role);

  return (
    <div className="space-y-6">
      <div className="flex max-w-2xl items-start justify-between gap-6">
        <p className="text-sm text-ink-muted">
          FQX uses Stripe to process payments. Buyers pay into FQX’s Stripe
          account and we hold the funds until settlement, where funds are then
          transferred into the seller’s nominated bank account. You must
          complete Stripe account setup here before you can list quota for sale
          or lease. This is Stripe test mode only.
        </p>
        <StripeLogo />
      </div>
      {!configured || !publishableKey ? (
        <p className="text-sm text-ink-muted">
          Payments are not configured. Purchases stay on the simulated path
          until Stripe test keys are set.
        </p>
      ) : (
        <>
          {canManage ? null : (
            <div className="max-w-2xl">
              <ActionNotice title="Payments setup">
                Only an owner or admin can connect Stripe for this business.
              </ActionNotice>
            </div>
          )}
          {canManage || status?.chargesEnabled || status?.detailsSubmitted ? (
            <div className={`max-w-2xl space-y-4 ${panelClassName}`}>
              {status?.chargesEnabled ? (
                <p className="text-sm text-ink">
                  This business can receive settlement transfers.
                </p>
              ) : status?.detailsSubmitted ? (
                <p className="text-sm text-ink">
                  Stripe has your details and is reviewing them. Refresh this
                  page in a minute.
                </p>
              ) : null}
              {canManage ? (
                <PaymentsConnect
                  organisationId={organisationId}
                  publishableKey={publishableKey}
                  detailsSubmitted={Boolean(status?.detailsSubmitted)}
                />
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

import { isPaymentsConfigured } from "@/lib/payments/env";
import { refreshOrganisationPaymentStatus } from "@/lib/payments/queries";

export const SELL_REQUIRES_STRIPE_MESSAGE =
  "Connect your Stripe account on the Payments page before you can list quota for sale or lease.";

export async function organisationCanSellError(organisationId: number) {
  if (!isPaymentsConfigured()) {
    return null;
  }

  const status = await refreshOrganisationPaymentStatus(organisationId);

  if (status?.chargesEnabled) {
    return null;
  }

  return SELL_REQUIRES_STRIPE_MESSAGE;
}

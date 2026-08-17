import "server-only";

import { isPaymentsConfigured } from "@/lib/payments/env";
import { createStripePaymentProvider } from "@/lib/payments/stripe";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProvider(): PaymentProvider | null {
  if (!isPaymentsConfigured()) {
    return null;
  }

  return createStripePaymentProvider();
}

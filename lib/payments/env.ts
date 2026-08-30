export function getStripeEnv(): {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
} | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secretKey || !publishableKey || !webhookSecret) {
    return null;
  }

  if (!secretKey.startsWith("sk_test_") || !publishableKey.startsWith("pk_test_")) {
    throw new Error("Phase 9 allows Stripe test keys only.");
  }

  return { secretKey, publishableKey, webhookSecret };
}

export function isPaymentsConfigured() {
  try {
    return getStripeEnv() !== null;
  } catch {
    return false;
  }
}

export function getStripePublishableKey() {
  try {
    return getStripeEnv()?.publishableKey ?? null;
  } catch {
    return null;
  }
}

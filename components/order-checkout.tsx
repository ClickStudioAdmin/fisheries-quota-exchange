"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { startOrderCheckoutAction } from "@/lib/payments/actions";

export function OrderCheckout({
  orderId,
  publishableKey,
}: {
  orderId: number;
  publishableKey: string;
}) {
  const router = useRouter();
  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    startOrderCheckoutAction(orderId).then((result) => {
      if (cancelled) {
        return;
      }

      if (result?.error) {
        setError(result.error);
        return;
      }

      setClientSecret(result?.clientSecret ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const onComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  if (error) {
    return (
      <p className="text-sm text-red-800" role="alert">
        {error}
      </p>
    );
  }

  if (!clientSecret) {
    return <p className="text-sm text-ink-muted">Loading payment…</p>;
  }

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ clientSecret, onComplete }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}

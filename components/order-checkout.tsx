"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { startOrderCheckoutAction } from "@/lib/payments/actions";

function CheckoutLoading() {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-sea border-t-transparent"
        aria-hidden
      />
      <p className="text-base font-medium text-ink">Preparing checkout</p>
      <p className="max-w-sm text-sm text-ink-muted">
        Loading card and bank debit from Stripe. Stay on this page — this
        usually takes a few seconds.
      </p>
    </div>
  );
}

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
  const checkoutRef = useRef<HTMLDivElement>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
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

      if (!result?.clientSecret) {
        setError("Could not start checkout.");
        return;
      }

      setClientSecret(result.clientSecret);
    });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!clientSecret) {
      return;
    }

    const root = checkoutRef.current;

    if (!root) {
      return;
    }

    function markReady() {
      if (root?.querySelector("iframe")) {
        setCheckoutReady(true);
      }
    }

    markReady();
    const observer = new MutationObserver(markReady);
    observer.observe(root, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => setCheckoutReady(true), 8000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [clientSecret]);

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
    return <CheckoutLoading />;
  }

  return (
    <div className="relative min-h-64">
      {checkoutReady ? null : (
        <div className="absolute inset-0 z-10 bg-paper-raised">
          <CheckoutLoading />
        </div>
      )}
      <div ref={checkoutRef}>
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret, onComplete }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

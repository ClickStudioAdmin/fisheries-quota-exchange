"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { OrderCheckoutStatus } from "@/components/order-checkout-status";
import { OrderPaymentPoll } from "@/components/order-payment-poll";
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
  const checkoutRef = useRef<HTMLDivElement>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    startOrderCheckoutAction(orderId).then((result) => {
      if (cancelled) {
        return;
      }

      if (result?.pending) {
        setPending(true);
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

  if (pending) {
    return (
      <>
        <OrderPaymentPoll />
        <OrderCheckoutStatus title="Confirming payment">
          Your payment was submitted. This page will update when Stripe
          confirms it.
        </OrderCheckoutStatus>
      </>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-800" role="alert">
        {error}
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <OrderCheckoutStatus title="Preparing checkout">
        Loading card and bank debit from Stripe. Stay on this page — this
        usually takes a few seconds.
      </OrderCheckoutStatus>
    );
  }

  return (
    <div className="relative min-h-64">
      {checkoutReady ? null : (
        <div className="absolute inset-0 z-10 bg-paper-raised">
          <OrderCheckoutStatus title="Preparing checkout">
            Loading card and bank debit from Stripe. Stay on this page — this
            usually takes a few seconds.
          </OrderCheckoutStatus>
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

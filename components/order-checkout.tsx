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
import { formatAud } from "@/lib/listings/types";
import { startOrderCheckoutAction } from "@/lib/payments/actions";
import {
  checkoutAllowsBecs,
  type CheckoutMethod,
} from "@/lib/payments/money";

const methodButtonClass = {
  on: "border border-sea bg-sea px-3 py-2 text-sm font-medium text-paper",
  off: "border border-line bg-paper-raised px-3 py-2 text-sm font-medium text-ink hover:border-sea",
};

export function OrderCheckout({
  orderId,
  publishableKey,
  listedAud,
  cardAud,
}: {
  orderId: number;
  publishableKey: string;
  listedAud: string;
  cardAud: string;
}) {
  const router = useRouter();
  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );
  const becsAvailable = checkoutAllowsBecs(listedAud);
  const [method, setMethod] = useState<CheckoutMethod>(
    becsAvailable ? "becs" : "card",
  );
  const checkoutRef = useRef<HTMLDivElement>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setClientSecret(null);
    setCheckoutReady(false);
    setError(null);
    setPending(false);

    startOrderCheckoutAction(orderId, method).then((result) => {
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
  }, [orderId, method]);

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

  const methodPicker = (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Payment method">
      {becsAvailable ? (
        <button
          type="button"
          aria-pressed={method === "becs"}
          className={methodButtonClass[method === "becs" ? "on" : "off"]}
          onClick={() => setMethod("becs")}
        >
          Bank debit {formatAud(listedAud)}
        </button>
      ) : null}
      <button
        type="button"
        aria-pressed={method === "card"}
        className={methodButtonClass[method === "card" ? "on" : "off"]}
        onClick={() => setMethod("card")}
      >
        Card {formatAud(cardAud)}
      </button>
    </div>
  );

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
      <div>
        {methodPicker}
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div>
        {methodPicker}
        <OrderCheckoutStatus title="Preparing checkout">
          Loading {method === "card" ? "card" : "bank debit"} from Stripe. Stay
          on this page — this usually takes a few seconds.
        </OrderCheckoutStatus>
      </div>
    );
  }

  return (
    <div>
      {methodPicker}
      <div className="relative min-h-64">
        {checkoutReady ? null : (
          <div className="absolute inset-0 z-10 bg-paper-raised">
            <OrderCheckoutStatus title="Preparing checkout">
              Loading {method === "card" ? "card" : "bank debit"} from Stripe.
              Stay on this page — this usually takes a few seconds.
            </OrderCheckoutStatus>
          </div>
        )}
        <div ref={checkoutRef}>
          <EmbeddedCheckoutProvider
            key={clientSecret}
            stripe={stripePromise}
            options={{ clientSecret, onComplete }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}

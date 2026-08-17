"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/auth-card";
import { startOrderCheckoutAction } from "@/lib/payments/actions";

export function PayOrderButton({ orderId }: { orderId: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={buttonClassName}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await startOrderCheckoutAction(orderId);
          setPending(false);

          if (result?.error) {
            setError(result.error);
          }
        }}
      >
        {pending ? "Opening Stripe…" : "Pay with card"}
      </button>
    </div>
  );
}

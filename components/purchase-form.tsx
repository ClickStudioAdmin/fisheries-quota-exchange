"use client";

import { useActionState, useEffect, useId, useState } from "react";
import {
  buttonClassName,
  tableSecondaryButtonClassName,
} from "@/components/auth-card";
import { TermsAcknowledgements } from "@/components/terms-acknowledgements";
import { createOrderAction } from "@/lib/orders/actions";
import type { OrderFormState } from "@/lib/orders/types";
import { BUYER_PURCHASE_ACKNOWLEDGEMENTS } from "@/lib/terms/acknowledgements";

const initialState: OrderFormState = {};

type PurchaseFormProps = {
  listingId: number;
};

export function PurchaseForm({ listingId }: PurchaseFormProps) {
  const [state, formAction, pending] = useActionState(
    createOrderAction,
    initialState,
  );
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!confirming) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setConfirming(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, pending]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="listing_id" value={listingId} />
      {!confirming && state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="button"
        className={buttonClassName}
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        Purchase Now
      </button>
      {confirming ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-16"
          onClick={() => {
            if (!pending) {
              setConfirming(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-lg border border-line bg-paper-raised p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-xl font-semibold text-ink">
              Confirm purchase
            </h2>
            {state.error ? (
              <p className="mt-3 text-sm text-red-800" role="alert">
                {state.error}
              </p>
            ) : null}
            <div className="mt-4">
              <TermsAcknowledgements
                title="Buyer acknowledgements"
                items={BUYER_PURCHASE_ACKNOWLEDGEMENTS}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                className={buttonClassName}
                disabled={pending}
              >
                {pending ? "Purchasing…" : "Confirm purchase"}
              </button>
              <button
                type="button"
                className={tableSecondaryButtonClassName}
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { buttonClassName } from "@/components/auth-card";
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

  return (
    <form action={formAction} className="flex h-full flex-col space-y-4">
      <input type="hidden" name="listing_id" value={listingId} />
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <TermsAcknowledgements
        title="Buyer acknowledgements"
        items={BUYER_PURCHASE_ACKNOWLEDGEMENTS}
      />
      <button type="submit" className={`${buttonClassName} mt-auto`} disabled={pending}>
        {pending ? "Purchasing…" : "Purchase Now"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import {
  updateListingPriceAction,
  type ListingFormState,
} from "@/lib/listings/actions";

const initialState: ListingFormState = {};

export function EditListingPriceForm({
  listingId,
  unitLabel,
  currentPrice,
  next,
}: {
  listingId: number;
  unitLabel: string;
  currentPrice: string;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateListingPriceAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="next" value={next} />
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="unit_price_aud" className="block text-sm text-ink">
          Price per {unitLabel} (AUD)
        </label>
        <input
          id="unit_price_aud"
          name="unit_price_aud"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={currentPrice}
          className={fieldClassName}
        />
      </div>
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Save price"}
      </button>
    </form>
  );
}

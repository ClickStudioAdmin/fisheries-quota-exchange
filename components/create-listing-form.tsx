"use client";

import { useActionState } from "react";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import {
  createListingAction,
  type ListingFormState,
} from "@/lib/listings/actions";

const initialState: ListingFormState = {};

type CreateListingFormProps = {
  organisationId: number;
  holdingId: number;
  maxQuantity: string;
  unitLabel: string;
};

export function CreateListingForm({
  organisationId,
  holdingId,
  maxQuantity,
  unitLabel,
}: CreateListingFormProps) {
  const [state, formAction, pending] = useActionState(
    createListingAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organisation_id" value={organisationId} />
      <input type="hidden" name="holding_id" value={holdingId} />
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="offering" className="block text-sm text-ink">
          Offering
        </label>
        <select
          id="offering"
          name="offering"
          required
          className={fieldClassName}
          defaultValue="SALE"
        >
          <option value="SALE">Sale</option>
          <option value="LEASE">Lease</option>
        </select>
      </div>
      <div>
        <label htmlFor="quantity" className="block text-sm text-ink">
          Quantity ({unitLabel}), max {maxQuantity}
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          step="any"
          min="0"
          max={maxQuantity}
          required
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="unit_price_aud" className="block text-sm text-ink">
          Price per unit (AUD)
        </label>
        <input
          id="unit_price_aud"
          name="unit_price_aud"
          type="number"
          step="0.01"
          min="0"
          required
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="expires_at" className="block text-sm text-ink">
          Expires
        </label>
        <input
          id="expires_at"
          name="expires_at"
          type="datetime-local"
          required
          className={fieldClassName}
        />
      </div>
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Submitting…" : "Submit for approval"}
      </button>
    </form>
  );
}

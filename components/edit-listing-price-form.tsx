"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fieldClassName, tableButtonClassName } from "@/components/auth-card";
import { QuantityField } from "@/components/quantity-field";
import { TableModal } from "@/components/table-modal";
import {
  updateListingAction,
  type ListingFormState,
} from "@/lib/listings/actions";

const initialState: ListingFormState = {};

type EditListingFormProps = {
  listingId: number;
  unitLabel: string;
  currentQuantity: string;
  maxQuantity: string;
  currentPrice: string;
  onSaved?: () => void;
};

export function EditListingForm({
  listingId,
  unitLabel,
  currentQuantity,
  maxQuantity,
  currentPrice,
  onSaved,
}: EditListingFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateListingAction,
    initialState,
  );

  useEffect(() => {
    if (state.message) {
      onSaved?.();
      router.refresh();
    }
  }, [state.message, onSaved, router]);

  return (
    <div className="space-y-2">
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-sea" role="status">
          {state.message}
        </p>
      ) : null}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="listing_id" value={listingId} />
        <div>
          <label
            htmlFor={`quantity-${listingId}`}
            className="block text-sm text-ink"
          >
            Quantity, max {maxQuantity}
          </label>
          <QuantityField
            id={`quantity-${listingId}`}
            unitLabel={unitLabel}
            required
            defaultValue={currentQuantity}
            max={maxQuantity}
          />
        </div>
        <div>
          <label
            htmlFor={`unit_price_aud-${listingId}`}
            className="block text-sm text-ink"
          >
            Price per {unitLabel} (AUD)
          </label>
          <input
            id={`unit_price_aud-${listingId}`}
            name="unit_price_aud"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={currentPrice}
            className={fieldClassName}
          />
        </div>
        <button
          type="submit"
          className={tableButtonClassName}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

export function EditListingPriceButton({
  title,
  label,
  triggerClassName,
  ...props
}: EditListingFormProps & {
  title: string;
  label?: string;
  triggerClassName?: string;
}) {
  return (
    <TableModal title={title} label={label} triggerClassName={triggerClassName}>
      {(close) => <EditListingForm {...props} onSaved={close} />}
    </TableModal>
  );
}

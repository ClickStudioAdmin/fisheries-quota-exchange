"use client";

import { useActionState } from "react";
import { OfferingField } from "@/components/offering-field";
import { QuantityField } from "@/components/quantity-field";
import { QldQuotaUsageFields } from "@/components/qld-quota-usage-fields";
import { TermsAcknowledgements } from "@/components/terms-acknowledgements";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import {
  createListingAction,
  type ListingFormState,
} from "@/lib/listings/actions";
import type { ListingOffering } from "@/lib/listings/types";
import { SELLER_ACKNOWLEDGEMENTS } from "@/lib/terms/acknowledgements";

const initialState: ListingFormState = {};

type CreateListingFormProps = {
  organisationId: number;
  holdingId: number;
  maxQuantity: string;
  unitLabel: string;
  offerings: ListingOffering[];
  requireQldUsage?: boolean;
  autoPublish?: boolean;
  feeNote?: string | null;
};

export function CreateListingForm({
  organisationId,
  holdingId,
  maxQuantity,
  unitLabel,
  offerings,
  requireQldUsage = false,
  autoPublish = false,
  feeNote = null,
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
      <OfferingField offerings={offerings} />
      <div>
        <label htmlFor="quantity" className="block text-sm text-ink">
          Quantity, max {maxQuantity}
        </label>
        <QuantityField
          id="quantity"
          unitLabel={unitLabel}
          required
          max={maxQuantity}
        />
      </div>
      {requireQldUsage ? (
        <QldQuotaUsageFields unitLabel={unitLabel} maxQuantity={maxQuantity} />
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
      {feeNote ? <p className="text-sm text-ink-muted">{feeNote}</p> : null}
      <TermsAcknowledgements
        title="Seller acknowledgements"
        items={SELLER_ACKNOWLEDGEMENTS}
      />
      <button type="submit" className={buttonClassName} disabled={pending || offerings.length === 0}>
        {pending
          ? "Submitting…"
          : autoPublish
            ? "Publish listing"
            : "Submit for approval"}
      </button>
    </form>
  );
}

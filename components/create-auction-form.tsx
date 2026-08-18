"use client";

import { useActionState } from "react";
import { QuantityField } from "@/components/quantity-field";
import { TermsAcknowledgements } from "@/components/terms-acknowledgements";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import {
  createAuctionAction,
} from "@/lib/auctions/actions";
import type { AuctionFormState } from "@/lib/auctions/types";
import { SELLER_ACKNOWLEDGEMENTS } from "@/lib/terms/acknowledgements";

const initialState: AuctionFormState = {};

type CreateAuctionFormProps = {
  organisationId: number;
  holdingId: number;
  maxQuantity: string;
  unitLabel: string;
  autoPublish?: boolean;
  feeNote?: string | null;
};

export function CreateAuctionForm({
  organisationId,
  holdingId,
  maxQuantity,
  unitLabel,
  autoPublish = false,
  feeNote = null,
}: CreateAuctionFormProps) {
  const [state, formAction, pending] = useActionState(
    createAuctionAction,
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
          Quantity, max {maxQuantity}
        </label>
        <QuantityField
          id="quantity"
          unitLabel={unitLabel}
          required
          max={maxQuantity}
        />
      </div>
      <div>
        <label htmlFor="starting_price_aud" className="block text-sm text-ink">
          Starting price per {unitLabel} (AUD)
        </label>
        <input
          id="starting_price_aud"
          name="starting_price_aud"
          type="number"
          step="0.01"
          min="0"
          required
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="bid_increment_aud" className="block text-sm text-ink">
          Bid increment (AUD)
        </label>
        <input
          id="bid_increment_aud"
          name="bid_increment_aud"
          type="number"
          step="0.01"
          min="0"
          required
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="reserve_price_aud" className="block text-sm text-ink">
          Reserve price per {unitLabel} (optional)
        </label>
        <input
          id="reserve_price_aud"
          name="reserve_price_aud"
          type="number"
          step="0.01"
          min="0"
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="starts_at" className="block text-sm text-ink">
          Starts
        </label>
        <input
          id="starts_at"
          name="starts_at"
          type="datetime-local"
          className={fieldClassName}
        />
      </div>
      <div>
        <label htmlFor="ends_at" className="block text-sm text-ink">
          Ends
        </label>
        <input
          id="ends_at"
          name="ends_at"
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
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending
          ? "Submitting…"
          : autoPublish
            ? "Publish auction"
            : "Submit auction for approval"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import { TermsAcknowledgements } from "@/components/terms-acknowledgements";
import { placeBidAction } from "@/lib/auctions/actions";
import type { BidFormState } from "@/lib/auctions/types";
import { formatAud } from "@/lib/listings/types";
import { BUYER_BID_ACKNOWLEDGEMENTS } from "@/lib/terms/acknowledgements";

const initialState: BidFormState = {};

type BidFormProps = {
  listingId: number;
  minimumBid: number;
};

export function BidForm({ listingId, minimumBid }: BidFormProps) {
  const [state, formAction, pending] = useActionState(
    placeBidAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="listing_id" value={listingId} />
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="amount_aud" className="block text-sm text-ink">
          Bid per unit (AUD), minimum {formatAud(minimumBid)}
        </label>
        <input
          id="amount_aud"
          name="amount_aud"
          type="number"
          step="0.01"
          min={minimumBid}
          required
          className={fieldClassName}
        />
      </div>
      <TermsAcknowledgements
        title="Bidder acknowledgements"
        items={BUYER_BID_ACKNOWLEDGEMENTS}
      />
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Bidding…" : "Place bid"}
      </button>
    </form>
  );
}

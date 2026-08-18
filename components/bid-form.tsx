"use client";

import { useActionState } from "react";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import { TermsAcknowledgements } from "@/components/terms-acknowledgements";
import { placeBidAction } from "@/lib/auctions/actions";
import type { BidFormState } from "@/lib/auctions/types";
import { formatAud } from "@/lib/listings/types";
import type { OrganisationSummary } from "@/lib/organisations/types";
import { BUYER_BID_ACKNOWLEDGEMENTS } from "@/lib/terms/acknowledgements";

const initialState: BidFormState = {};

type BidFormProps = {
  listingId: number;
  minimumBid: number;
  organisations: OrganisationSummary[];
};

export function BidForm({ listingId, minimumBid, organisations }: BidFormProps) {
  const [state, formAction, pending] = useActionState(
    placeBidAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <input type="hidden" name="listing_id" value={listingId} />
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {organisations.length === 1 ? (
        <input
          type="hidden"
          name="bidder_organisation_id"
          value={organisations[0].id}
        />
      ) : (
        <div>
          <label htmlFor="bidder_organisation_id" className="block text-sm text-ink">
            Bid as
          </label>
          <select
            id="bidder_organisation_id"
            name="bidder_organisation_id"
            required
            className={fieldClassName}
            defaultValue=""
          >
            <option value="" disabled>
              Choose organisation
            </option>
            {organisations.map((organisation) => (
              <option key={organisation.id} value={organisation.id}>
                {organisation.legal_name}
              </option>
            ))}
          </select>
        </div>
      )}
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
        title="Buyer acknowledgements"
        items={BUYER_BID_ACKNOWLEDGEMENTS}
      />
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Bidding…" : "Place bid"}
      </button>
    </form>
  );
}

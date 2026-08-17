"use client";

import { useActionState } from "react";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import { createOrderAction } from "@/lib/orders/actions";
import type { OrderFormState } from "@/lib/orders/types";
import type { OrganisationSummary } from "@/lib/organisations/types";

const initialState: OrderFormState = {};

type PurchaseFormProps = {
  listingId: number;
  organisations: OrganisationSummary[];
};

export function PurchaseForm({ listingId, organisations }: PurchaseFormProps) {
  const [state, formAction, pending] = useActionState(
    createOrderAction,
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
          name="buyer_organisation_id"
          value={organisations[0].id}
        />
      ) : (
        <div>
          <label htmlFor="buyer_organisation_id" className="block text-sm text-ink">
            Buy as
          </label>
          <select
            id="buyer_organisation_id"
            name="buyer_organisation_id"
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
      <p className="text-sm text-ink-muted">
        This creates an order and reserves the quota. If the seller accepts
        cards, you will pay FQX in Stripe test mode. A platform admin then
        runs compliance, transfer, and settlement.
      </p>
      <button type="submit" className={buttonClassName} disabled={pending}>
                {pending ? "Continuing…" : "Purchase"}
      </button>
    </form>
  );
}

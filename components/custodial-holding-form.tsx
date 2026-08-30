"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createCustodialHoldingAction,
  type AdminFormState,
} from "@/lib/fisheries/actions";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import { QuantityField } from "@/components/quantity-field";
import {
  fisherySelectLabel,
  quantityTypeLabel,
  type Fishery,
  type Jurisdiction,
} from "@/lib/fisheries/types";

const initialState: AdminFormState = {};

type CustodialHoldingFormProps = {
  organisationId: number;
  fisheries: Fishery[];
  jurisdictions: Jurisdiction[];
  qldJurisdictionId: number;
  existingCustodialFisheryIds: number[];
};

export function CustodialHoldingForm({
  organisationId,
  fisheries,
  jurisdictions,
  qldJurisdictionId,
  existingCustodialFisheryIds,
}: CustodialHoldingFormProps) {
  const [state, formAction, pending] = useActionState(
    createCustodialHoldingAction,
    initialState,
  );
  const qldFisheries = useMemo(
    () =>
      fisheries.filter(
        (item) =>
          item.jurisdiction_id === qldJurisdictionId &&
          item.lease_allowed &&
          !existingCustodialFisheryIds.includes(item.id),
      ),
    [existingCustodialFisheryIds, fisheries, qldJurisdictionId],
  );
  const [fisheryId, setFisheryId] = useState("");
  const selected = useMemo(
    () => qldFisheries.find((item) => String(item.id) === fisheryId),
    [fisheryId, qldFisheries],
  );
  const unitLabel = selected ? quantityTypeLabel(selected.quantity_type) : "";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="organisation_id" value={organisationId} />
      <p className="text-sm text-ink-muted">
        Request temporary FishNet custodianship for Queensland lease listings.
        FQX does not own this quota. Transfer it to FQX on FishNet, then wait
        for admin verification before listing a lease.
      </p>
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
      {qldFisheries.length === 0 ? (
        <p className="text-sm text-ink-muted">
          You already have an active custodial holding for each eligible
          Queensland fishery, or none allow lease.
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="custodial_fishery_id" className="block text-sm text-ink">
              Fishery
            </label>
            <select
              id="custodial_fishery_id"
              name="fishery_id"
              required
              value={fisheryId}
              onChange={(event) => setFisheryId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Select</option>
              {qldFisheries.map((item) => (
                <option key={item.id} value={item.id}>
                  {fisherySelectLabel(item, jurisdictions)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="custodial_quantity" className="block text-sm text-ink">
              Quantity
            </label>
            <QuantityField
              id="custodial_quantity"
              name="quantity"
              unitLabel={unitLabel || "—"}
              required
            />
          </div>
          <div>
            <label htmlFor="custodial_note" className="block text-sm text-ink">
              Note
            </label>
            <input
              id="custodial_note"
              name="note"
              type="text"
              className={fieldClassName}
            />
          </div>
          <button type="submit" className={buttonClassName} disabled={pending}>
            {pending ? "Submitting…" : "Request custodial quota"}
          </button>
        </>
      )}
    </form>
  );
}

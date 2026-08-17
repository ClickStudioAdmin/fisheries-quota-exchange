"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createHoldingAction,
  type AdminFormState,
} from "@/lib/fisheries/actions";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import { QuantityField } from "@/components/quantity-field";
import {
  quantityTypeLabel,
  type Fishery,
} from "@/lib/fisheries/types";

const initialState: AdminFormState = {};

type HoldingFormProps = {
  fisheries: Fishery[];
  organisationId?: number;
  organisations?: { id: number; legal_name: string }[];
};

export function HoldingForm({
  fisheries,
  organisationId,
  organisations,
}: HoldingFormProps) {
  const [state, formAction, pending] = useActionState(
    createHoldingAction,
    initialState,
  );
  const [fisheryId, setFisheryId] = useState("");
  const selected = useMemo(
    () => fisheries.find((item) => String(item.id) === fisheryId),
    [fisheries, fisheryId],
  );
  const unitLabel = selected ? quantityTypeLabel(selected.quantity_type) : "";

  return (
    <form action={formAction} className="space-y-3">
      {organisationId != null ? (
        <input type="hidden" name="organisation_id" value={organisationId} />
      ) : null}
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
      {organisations ? (
        <div>
          <label htmlFor="organisation_id" className="block text-sm text-ink">
            Organisation
          </label>
          <select
            id="organisation_id"
            name="organisation_id"
            required
            className={fieldClassName}
          >
            <option value="">Select</option>
            {organisations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.legal_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label htmlFor="fishery_id" className="block text-sm text-ink">
          Fishery
        </label>
        <select
          id="fishery_id"
          name="fishery_id"
          required
          value={fisheryId}
          onChange={(event) => setFisheryId(event.target.value)}
          className={fieldClassName}
        >
          <option value="">Select</option>
          {fisheries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="quantity" className="block text-sm text-ink">
          Quantity
        </label>
        <QuantityField id="quantity" unitLabel={unitLabel || "—"} required />
      </div>
      <div>
        <label htmlFor="note" className="block text-sm text-ink">
          Note
        </label>
        <input id="note" name="note" type="text" className={fieldClassName} />
      </div>
      <button type="submit" className={buttonClassName} disabled={pending}>
        {pending ? "Saving…" : "Add holding"}
      </button>
    </form>
  );
}

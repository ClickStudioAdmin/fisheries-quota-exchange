"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adjustHoldingAction } from "@/lib/fisheries/actions";
import type { AdminFormState } from "@/lib/fisheries/actions";
import { QuantityField } from "@/components/quantity-field";
import { tableButtonClassName } from "@/components/auth-card";

const initialState: AdminFormState = {};

type HoldingActionsProps = {
  holdingId: number;
  quantity: string;
  unitLabel: string;
  minQuantity?: string;
  onSaved?: () => void;
};

export function HoldingActions({
  holdingId,
  quantity,
  unitLabel,
  minQuantity = "0",
  onSaved,
}: HoldingActionsProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    adjustHoldingAction,
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
        <input type="hidden" name="holding_id" value={String(holdingId)} />
        <div>
          <label htmlFor={`quantity-${holdingId}`} className="block text-sm text-ink">
            Quantity
          </label>
          <QuantityField
            id={`quantity-${holdingId}`}
            unitLabel={unitLabel}
            required
            defaultValue={quantity}
            min={minQuantity}
          />
        </div>
        {Number(minQuantity) > 0 ? (
          <p className="text-sm text-ink-muted">
            Cannot go below {minQuantity} {unitLabel} while listings are open.
            Cancel listings first to reduce further.
          </p>
        ) : null}
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
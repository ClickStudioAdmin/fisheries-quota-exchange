"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adjustHoldingAction } from "@/lib/fisheries/actions";
import type { AdminFormState } from "@/lib/fisheries/actions";
import { QuantityField } from "@/components/quantity-field";
import { tableButtonClassName } from "@/components/auth-card";
import { TableActionRow } from "@/components/data-table";

const initialState: AdminFormState = {};

type HoldingActionsProps = {
  holdingId: number;
  quantity: string;
  unitLabel: string;
  minQuantity?: string;
};

export function HoldingActions({
  holdingId,
  quantity,
  unitLabel,
  minQuantity = "0",
}: HoldingActionsProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    adjustHoldingAction,
    initialState,
  );

  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [state.message, router]);

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
      <form action={formAction}>
        <input type="hidden" name="holding_id" value={String(holdingId)} />
        <TableActionRow>
          <label className="sr-only" htmlFor={`quantity-${holdingId}`}>
            Quantity
          </label>
          <QuantityField
            id={`quantity-${holdingId}`}
            unitLabel={unitLabel}
            required
            defaultValue={quantity}
            min={minQuantity}
            compact
          />
          <button
            type="submit"
            className={tableButtonClassName}
            disabled={pending}
          >
            {pending ? "Saving…" : "Update quantity"}
          </button>
        </TableActionRow>
        {Number(minQuantity) > 0 ? (
          <p className="text-xs text-ink-muted">
            Cannot go below {minQuantity} {unitLabel} while listings are open.
            Cancel listings first to reduce further.
          </p>
        ) : null}
      </form>
    </div>
  );
}
"use client";

import { useActionState } from "react";
import {
  cancelCustodyReleaseAction,
  requestCustodyReleaseAction,
  type AdminFormState,
} from "@/lib/fisheries/actions";
import { buttonClassName, tableSecondaryButtonClassName } from "@/components/auth-card";
import { QuantityField } from "@/components/quantity-field";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { CustodyReleaseRequest } from "@/lib/fisheries/types";
import { custodyReleaseStatusLabel } from "@/lib/fisheries/types";
import { formatTableDateTime } from "@/lib/format";

const initialState: AdminFormState = {};

export function CustodyReleaseForm({
  holdingId,
  unitLabel,
  maxQuantity,
  pendingReleaseQuantity,
  requests,
  canManage,
}: {
  holdingId: number;
  unitLabel: string;
  maxQuantity: number;
  pendingReleaseQuantity: number;
  requests: CustodyReleaseRequest[];
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    requestCustodyReleaseAction,
    initialState,
  );
  const available = Math.max(0, maxQuantity - pendingReleaseQuantity);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Request return of custodial quota to your member-held FishNet account.
        Pending release quantity is reserved until FQX completes or cancels the
        request.
      </p>
      {requests.length > 0 ? (
        <ul className="space-y-2 text-sm text-ink">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-line px-3 py-2"
            >
              <span>
                {request.quantity} {unitLabel} ·{" "}
                {custodyReleaseStatusLabel(request.status)} ·{" "}
                {formatTableDateTime(request.created_at)}
              </span>
              {canManage && request.status === "PENDING" ? (
                <form action={cancelCustodyReleaseAction}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <PendingSubmitButton
                    className={tableSecondaryButtonClassName}
                    pendingLabel="Cancelling…"
                  >
                    Cancel request
                  </PendingSubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canManage && available > 0 ? (
        <form action={formAction} className="max-w-md space-y-3">
          <input type="hidden" name="holding_id" value={holdingId} />
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
          <div>
            <label htmlFor={`release-qty-${holdingId}`} className="block text-sm text-ink">
              Quantity to release
            </label>
            <QuantityField
              id={`release-qty-${holdingId}`}
              name="quantity"
              unitLabel={unitLabel}
              max={String(available)}
              required
            />
            <p className="mt-1 text-sm text-ink-muted">
              Up to {available} {unitLabel} available (
              {pendingReleaseQuantity} {unitLabel} already in pending releases).
            </p>
          </div>
          <button type="submit" className={buttonClassName} disabled={pending}>
            {pending ? "Submitting…" : "Request release"}
          </button>
        </form>
      ) : canManage ? (
        <p className="text-sm text-ink-muted">
          No custodial quantity is available to release. Cancel a pending request
          or reduce listed quantity first.
        </p>
      ) : null}
    </div>
  );
}

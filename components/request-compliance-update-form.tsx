"use client";

import { useActionState, useState } from "react";
import {
  fieldClassName,
  tableButtonClassName,
} from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { requestComplianceUpdateAction } from "@/lib/orders/actions";
import type { OrderFormState } from "@/lib/orders/types";

const initialState: OrderFormState = {};

export function RequestComplianceUpdateForm({
  orderId,
  buyerName,
  sellerName,
}: {
  orderId: number;
  buyerName: string;
  sellerName: string;
}) {
  const [state, formAction] = useActionState(
    requestComplianceUpdateAction,
    initialState,
  );
  const [notifyBuyer, setNotifyBuyer] = useState(false);
  const [notifySeller, setNotifySeller] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />
      <div>
        <h4 className="text-sm font-semibold text-ink">Request update</h4>
        <p className="mt-1 text-sm text-ink-muted">
          The order stays in compliance review. Quota stays reserved. Only the
          parties you tick are emailed.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="notify_buyer"
          value="1"
          checked={notifyBuyer}
          onChange={(event) => setNotifyBuyer(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 border-line accent-sea"
        />
        <span>Notify buyer · {buyerName}</span>
      </label>
      {notifyBuyer ? (
        <div>
          <label
            htmlFor={`buyer-note-${orderId}`}
            className="block text-sm text-ink"
          >
            Message to buyer
          </label>
          <textarea
            id={`buyer-note-${orderId}`}
            name="buyer_note"
            required
            rows={3}
            className={fieldClassName}
          />
        </div>
      ) : null}
      <label className="flex items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="notify_seller"
          value="1"
          checked={notifySeller}
          onChange={(event) => setNotifySeller(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 border-line accent-sea"
        />
        <span>Notify seller · {sellerName}</span>
      </label>
      {notifySeller ? (
        <div>
          <label
            htmlFor={`seller-note-${orderId}`}
            className="block text-sm text-ink"
          >
            Message to seller
          </label>
          <textarea
            id={`seller-note-${orderId}`}
            name="seller_note"
            required
            rows={3}
            className={fieldClassName}
          />
        </div>
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
      <PendingSubmitButton
        className={tableButtonClassName}
        pendingLabel="Sending…"
        disabled={!notifyBuyer && !notifySeller}
      >
        Request update
      </PendingSubmitButton>
    </form>
  );
}

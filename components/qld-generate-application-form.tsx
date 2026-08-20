"use client";

import { useActionState } from "react";
import { tableButtonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  generateTransferDocumentAdminAction,
  type TransferFormState,
} from "@/lib/transfers/actions";

const initialState: TransferFormState = {};

export function QldGenerateApplicationForm({
  orderId,
  remainingQueue,
  label,
}: {
  orderId: number;
  remainingQueue: number[];
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    generateTransferDocumentAdminAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      {remainingQueue.map((id) => (
        <input key={id} type="hidden" name="review_queue" value={id} />
      ))}
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <PendingSubmitButton
        className={tableButtonClassName}
        pendingLabel="Preparing…"
        disabled={pending}
      >
        {label}
      </PendingSubmitButton>
    </form>
  );
}

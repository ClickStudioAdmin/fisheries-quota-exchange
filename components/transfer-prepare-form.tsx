"use client";

import { useActionState } from "react";
import { buttonClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  generateTransferDocumentAction,
  type TransferFormState,
} from "@/lib/transfers/actions";

const initialState: TransferFormState = {};

export function TransferPrepareForm({ orderId }: { orderId: number }) {
  const [state, formAction, pending] = useActionState(
    generateTransferDocumentAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
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
        className={buttonClassName}
        pendingLabel="Preparing…"
        disabled={pending}
      >
        Prepare application
      </PendingSubmitButton>
    </form>
  );
}

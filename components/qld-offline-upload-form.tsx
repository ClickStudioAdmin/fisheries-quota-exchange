"use client";

import { useActionState } from "react";
import {
  fieldClassName,
  tableButtonClassName,
} from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  uploadSignedPackAction,
  type TransferFormState,
} from "@/lib/transfers/actions";

const initialState: TransferFormState = {};

export function QldOfflineUploadForm({
  orderId,
  remainingQueue,
  packKind,
  inputId,
  fileLabel,
  submitLabel,
}: {
  orderId: number;
  remainingQueue: number[];
  packKind: "seller_signed" | "signed_pack";
  inputId: string;
  fileLabel: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    uploadSignedPackAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="pack_kind" value={packKind} />
      {remainingQueue.map((id) => (
        <input key={id} type="hidden" name="review_queue" value={id} />
      ))}
      <div>
        <label htmlFor={inputId} className="block text-sm text-ink">
          {fileLabel}
        </label>
        <input
          id={inputId}
          name="signed_pack"
          type="file"
          accept="application/pdf"
          required
          className={fieldClassName}
        />
      </div>
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
        pendingLabel="Uploading…"
        disabled={pending}
      >
        {submitLabel}
      </PendingSubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { buttonClassName, fieldClassName } from "@/components/auth-card";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  uploadPartyTransferDocumentAction,
  type TransferFormState,
} from "@/lib/transfers/actions";

const initialState: TransferFormState = {};

export function TransferPartyUploadForm({
  orderId,
  label,
}: {
  orderId: number;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    uploadPartyTransferDocumentAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <div>
        <label htmlFor={`party-signed-${orderId}`} className="block text-sm text-ink">
          Signed PDF
        </label>
        <input
          id={`party-signed-${orderId}`}
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
        className={buttonClassName}
        pendingLabel="Uploading…"
        disabled={pending}
      >
        {label}
      </PendingSubmitButton>
    </form>
  );
}

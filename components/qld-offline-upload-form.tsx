"use client";

import { useActionState } from "react";
import { buttonClassName } from "@/components/auth-card";
import { FileDropzone } from "@/components/file-dropzone";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  uploadSignedPackAction,
  type TransferFormState,
} from "@/lib/transfers/actions";

const initialState: TransferFormState = {};
const MAX_PDF_BYTES = 10 * 1024 * 1024;

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
    <form action={formAction} className="mt-4 max-w-lg space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="pack_kind" value={packKind} />
      {remainingQueue.map((id) => (
        <input key={id} type="hidden" name="review_queue" value={id} />
      ))}
      <div>
        <p className="text-sm text-ink">{fileLabel}</p>
        <FileDropzone
          id={inputId}
          name="signed_pack"
          accept="application/pdf"
          required
          emptyTitle="Drop PDF here or click to browse"
          hint="PDF up to 10 MB"
          maxBytes={MAX_PDF_BYTES}
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
        {submitLabel}
      </PendingSubmitButton>
    </form>
  );
}

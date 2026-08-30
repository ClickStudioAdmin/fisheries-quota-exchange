"use client";

import { useActionState } from "react";
import { buttonClassName } from "@/components/auth-card";
import { FileDropzone } from "@/components/file-dropzone";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  uploadPartyTransferDocumentAction,
  type TransferFormState,
} from "@/lib/transfers/actions";

const initialState: TransferFormState = {};
const MAX_PDF_BYTES = 10 * 1024 * 1024;

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
    <form action={formAction} className="mt-4 max-w-lg space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
          Signed PDF
        </p>
        <FileDropzone
          id={`party-signed-${orderId}`}
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
        {label}
      </PendingSubmitButton>
    </form>
  );
}

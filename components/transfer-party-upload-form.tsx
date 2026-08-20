"use client";

import { useActionState, useState } from "react";
import { buttonClassName } from "@/components/auth-card";
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
  const [filename, setFilename] = useState("");
  const inputId = `party-signed-${orderId}`;

  return (
    <form action={formAction} className="mt-4 max-w-lg space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
          Signed PDF
        </p>
        <label
          htmlFor={inputId}
          className="mt-1 flex cursor-pointer items-center gap-3 border border-dashed border-line bg-paper px-3 py-3 hover:border-sea"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-paper-stripe text-[11px] font-semibold tracking-[0.08em] text-ink-muted">
            PDF
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">
              {filename || "Choose signed PDF"}
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {filename ? "Ready to upload" : "PDF up to 10 MB"}
            </span>
          </span>
        </label>
        <input
          id={inputId}
          name="signed_pack"
          type="file"
          accept="application/pdf"
          required
          className="sr-only"
          onChange={(event) => {
            setFilename(event.target.files?.[0]?.name ?? "");
          }}
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

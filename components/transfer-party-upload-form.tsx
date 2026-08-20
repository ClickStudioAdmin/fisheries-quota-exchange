"use client";

import { useActionState, useRef, useState, type DragEvent } from "react";
import { buttonClassName } from "@/components/auth-card";
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
  const [filename, setFilename] = useState("");
  const [localError, setLocalError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const inputId = `party-signed-${orderId}`;

  function applyFile(file: File | undefined) {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    if (!file) {
      input.value = "";
      setFilename("");
      setLocalError("");
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      input.value = "";
      setFilename("");
      setLocalError("Choose a PDF.");
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      input.value = "";
      setFilename("");
      setLocalError("Choose a PDF up to 10 MB.");
      return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    setFilename(file.name);
    setLocalError("");
  }

  function onDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setDragging(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    applyFile(event.dataTransfer.files[0]);
  }

  return (
    <form action={formAction} className="mt-4 max-w-lg space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
          Signed PDF
        </p>
        <label
          htmlFor={inputId}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`mt-1 flex cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-8 text-center ${
            dragging
              ? "border-sea bg-sea/10"
              : "border-line bg-paper-stripe hover:border-sea"
          }`}
        >
          <UploadGlyph className="h-8 w-8 text-sea" />
          {filename ? (
            <>
              <span className="mt-3 max-w-full truncate text-sm font-medium text-ink">
                {filename}
              </span>
              <span className="mt-1 text-xs text-ink-muted">
                Drop a different PDF here, or click to browse
              </span>
            </>
          ) : (
            <>
              <span className="mt-3 text-sm font-medium text-ink">
                Drop PDF here or click to browse
              </span>
              <span className="mt-1 text-xs text-ink-muted">
                PDF up to 10 MB
              </span>
            </>
          )}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="signed_pack"
          type="file"
          accept="application/pdf"
          required
          className="sr-only"
          onChange={(event) => {
            applyFile(event.target.files?.[0]);
          }}
        />
      </div>
      {localError || state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {localError || state.error}
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

function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V5" />
      <path d="M8 9l4-4 4 4" />
      <path d="M5 19h14" />
    </svg>
  );
}

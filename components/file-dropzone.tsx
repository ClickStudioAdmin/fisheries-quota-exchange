"use client";

import { useRef, useState, type DragEvent } from "react";
import { fileMatchesAccept } from "@/lib/uploads/accept";

export function FileDropzone({
  id,
  name,
  accept,
  required = false,
  hint,
  emptyTitle,
  maxBytes,
}: {
  id: string;
  name: string;
  accept: string;
  required?: boolean;
  hint: string;
  emptyTitle: string;
  maxBytes?: number;
}) {
  const [filename, setFilename] = useState("");
  const [localError, setLocalError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

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

    if (!fileMatchesAccept(file, accept)) {
      input.value = "";
      setFilename("");
      setLocalError(acceptError(accept));
      return;
    }

    if (maxBytes != null && file.size > maxBytes) {
      input.value = "";
      setFilename("");
      setLocalError(sizeError(maxBytes));
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
    <div>
      <label
        htmlFor={id}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`mt-1 flex w-full max-w-lg cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-8 text-center ${
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
              Drop a different file here, or click to browse
            </span>
          </>
        ) : (
          <>
            <span className="mt-3 text-sm font-medium text-ink">
              {emptyTitle}
            </span>
            <span className="mt-1 text-xs text-ink-muted">{hint}</span>
          </>
        )}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(event) => {
          applyFile(event.target.files?.[0]);
        }}
      />
      {localError ? (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}

function acceptError(accept: string) {
  if (accept.includes("application/pdf")) {
    return "Choose a PDF.";
  }

  if (accept.includes("image/")) {
    return "Choose a JPEG, PNG, WebP, or GIF image.";
  }

  return "Choose a supported file.";
}

function sizeError(maxBytes: number) {
  const megabytes = maxBytes / (1024 * 1024);
  const label = Number.isInteger(megabytes)
    ? `${megabytes} MB`
    : `${megabytes.toFixed(1)} MB`;
  return `Choose a file up to ${label}.`;
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

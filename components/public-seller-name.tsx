"use client";

import { useId, useRef, useState } from "react";
import type { PublicSellerDisplay } from "@/lib/organisations/public-seller";

export function PublicSellerName({
  display,
}: {
  display: PublicSellerDisplay;
}) {
  const tooltipId = useId();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  if (!display.tooltip) {
    return display.label;
  }

  function show() {
    const rect = markerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const width = 288;
    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - width - 8),
    );

    setPosition({ top: rect.bottom + 8, left });
    setOpen(true);
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="min-w-0 truncate">{display.label}</span>
      <span
        ref={markerRef}
        tabIndex={0}
        aria-label={`Seller is ${display.tooltip}`}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-medium leading-none text-ink-muted hover:border-sea hover:text-sea"
      >
        i
      </span>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 w-72 border border-line bg-paper-raised p-3 text-left text-sm text-ink shadow-sm"
        >
          {display.tooltip}
        </span>
      ) : null}
    </span>
  );
}

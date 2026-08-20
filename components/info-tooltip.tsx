"use client";

import { useId, useRef, useState } from "react";

export type InfoTooltipDetail = {
  label: string;
  value: string;
};

export function InfoTooltip({
  details,
  label = "More details",
}: {
  details: readonly InfoTooltipDetail[];
  label?: string;
}) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function show() {
    const rect = buttonRef.current?.getBoundingClientRect();

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

  if (details.length === 0) {
    return null;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-medium leading-none text-ink-muted hover:border-sea hover:text-sea"
      >
        i
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 w-72 border border-line bg-paper-raised p-3 text-left shadow-sm"
        >
          <dl className="space-y-2">
            {details.map((item) => (
              <div key={item.label}>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  {item.label}
                </dt>
                <dd className="mt-0.5 whitespace-pre-line text-xs text-ink">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </span>
      ) : null}
    </>
  );
}

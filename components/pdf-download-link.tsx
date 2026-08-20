export function PdfDownloadLink({
  href,
  children,
  hint = "PDF document",
}: {
  href: string;
  children: string;
  hint?: string;
}) {
  return (
    <a
      href={href}
      className="group flex w-full max-w-lg items-center gap-3 border border-line bg-paper px-3 py-3 hover:border-sea"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-sea/15 text-[11px] font-semibold tracking-[0.08em] text-sea">
        PDF
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          {children}
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sea">
        Download
        <DownloadArrow className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}

function DownloadArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v7" />
      <path d="M5 8l3 3 3-3" />
      <path d="M3.5 13h9" />
    </svg>
  );
}

export function OrderCheckoutStatus({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-sea border-t-transparent"
        aria-hidden
      />
      <p className="text-base font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{children}</p>
    </div>
  );
}

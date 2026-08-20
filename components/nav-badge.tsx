export function NavBadge({
  count,
}: {
  count: number;
  tone?: "onLight" | "onDark";
}) {
  if (count <= 0) {
    return null;
  }

  const label = count === 1 ? "1 action required" : `${count} actions required`;
  const display = count > 99 ? "99+" : String(count);

  return (
    <span
      aria-label={label}
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-200 px-1 text-[11px] font-medium leading-none text-amber-900"
    >
      {display}
    </span>
  );
}

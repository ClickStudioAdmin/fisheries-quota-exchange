export function NavBadge({
  count,
  tone = "onLight",
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
      className={
        tone === "onDark"
          ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-paper px-1 text-[11px] font-medium leading-none text-ink"
          : "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sea px-1 text-[11px] font-medium leading-none text-paper"
      }
    >
      {display}
    </span>
  );
}

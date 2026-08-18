import Link from "next/link";
import type { Acknowledgement } from "@/lib/terms/acknowledgements";

export function TermsAcknowledgements({
  title,
  items,
}: {
  title: string;
  items: readonly Acknowledgement[];
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-ink">{title}</legend>
      <p className="text-sm text-ink-muted">
        Tick every box. These match the{" "}
        <Link href="/terms" className="underline">
          terms of service
        </Link>
        .
      </p>
      {items.map((item) => (
        <label
          key={item.name}
          className="flex items-start gap-2 text-sm text-ink"
        >
          <input
            type="checkbox"
            name={item.name}
            required
            className="mt-1 h-4 w-4 shrink-0 border-line accent-sea"
          />
          <span>{item.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

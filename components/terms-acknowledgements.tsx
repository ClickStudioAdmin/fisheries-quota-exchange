import Link from "next/link";
import type { Acknowledgement } from "@/lib/terms/acknowledgements";

const TERMS_PHRASE = "terms of service";

function AcknowledgementLabel({ label }: { label: string }) {
  const index = label.toLowerCase().lastIndexOf(TERMS_PHRASE);

  if (index === -1) {
    return label;
  }

  const linked = label.slice(index);
  const hasStop = linked.endsWith(".");

  return (
    <>
      {label.slice(0, index)}
      <Link
        href="/terms"
        className="underline"
        onClick={(event) => event.stopPropagation()}
      >
        {hasStop ? linked.slice(0, -1) : linked}
      </Link>
      {hasStop ? "." : null}
    </>
  );
}

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
          <span>
            <AcknowledgementLabel label={item.label} />
          </span>
        </label>
      ))}
    </fieldset>
  );
}

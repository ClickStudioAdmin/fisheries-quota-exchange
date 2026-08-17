import { fieldClassName } from "@/components/auth-card";

type QuantityFieldProps = {
  id: string;
  name?: string;
  unitLabel: string;
  required?: boolean;
  defaultValue?: string;
  min?: string;
  max?: string;
  compact?: boolean;
};

export function QuantityField({
  id,
  name = "quantity",
  unitLabel,
  required,
  defaultValue,
  min = "0",
  max,
  compact,
}: QuantityFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        name={name}
        type="number"
        step="any"
        min={min}
        max={max}
        required={required}
        defaultValue={defaultValue}
        className={compact ? "w-36 border border-line bg-paper-raised px-2 py-1.5 text-sm text-ink outline-none focus:border-sea" : fieldClassName}
      />
      <span className="shrink-0 text-sm text-ink">{unitLabel}</span>
    </div>
  );
}

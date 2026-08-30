function SwitchTrack({
  name,
  value,
  defaultChecked,
  checked,
  onCheckedChange,
  disabled,
}: {
  name?: string;
  value?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const controlled = checked !== undefined;

  return (
    <>
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={controlled ? checked : undefined}
        defaultChecked={controlled ? undefined : defaultChecked}
        disabled={disabled}
        onChange={
          onCheckedChange
            ? (event) => onCheckedChange(event.target.checked)
            : undefined
        }
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-ink-muted/20 transition-colors after:absolute after:top-0.5 after:left-0.5 after:block after:h-5 after:w-5 after:rounded-full after:bg-paper-raised after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-sea peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-sea peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper peer-disabled:opacity-60"
      />
    </>
  );
}

export function SettingsSwitch({
  name,
  value,
  defaultChecked,
  checked,
  onCheckedChange,
  label,
}: {
  name?: string;
  value?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center">
      <SwitchTrack
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <span className="sr-only">{label}</span>
    </label>
  );
}

export function SettingsSwitchRow({
  name,
  defaultChecked,
  checked,
  onCheckedChange,
  title,
  description,
  className,
  disabled,
}: {
  name: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  title: string;
  description: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 px-3 py-3 ${
        disabled ? "cursor-default" : "cursor-pointer"
      } ${className ?? ""}`.trim()}
    >
      <span>
        <span className="block text-sm text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">
          {description}
        </span>
      </span>
      <SwitchTrack
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </label>
  );
}

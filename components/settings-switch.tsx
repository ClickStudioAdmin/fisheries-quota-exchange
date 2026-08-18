function SwitchTrack({
  name,
  value,
  defaultChecked,
}: {
  name: string;
  value?: string;
  defaultChecked?: boolean;
}) {
  return (
    <>
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-ink-muted/20 transition-colors after:absolute after:top-0.5 after:left-0.5 after:block after:h-5 after:w-5 after:rounded-full after:bg-paper-raised after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-sea peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-sea peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper"
      />
    </>
  );
}

export function SettingsSwitch({
  name,
  value,
  defaultChecked,
  label,
}: {
  name: string;
  value?: string;
  defaultChecked?: boolean;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center">
      <SwitchTrack
        name={name}
        value={value}
        defaultChecked={defaultChecked}
      />
      <span className="sr-only">{label}</span>
    </label>
  );
}

export function SettingsSwitchRow({
  name,
  defaultChecked,
  title,
  description,
  className,
}: {
  name: string;
  defaultChecked?: boolean;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 px-3 py-3 ${className ?? ""}`.trim()}
    >
      <span>
        <span className="block text-sm text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">
          {description}
        </span>
      </span>
      <SwitchTrack name={name} defaultChecked={defaultChecked} />
    </label>
  );
}

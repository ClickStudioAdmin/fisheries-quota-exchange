import { statusToneClass } from "@/lib/status-tone";

export { statusToneClass } from "@/lib/status-tone";

export function isStatusColumn(key: string, header?: string) {
  return (
    key === "status" ||
    key === "verified" ||
    key === "access" ||
    key === "admin" ||
    header === "Status" ||
    header === "Verified" ||
    header === "Access" ||
    header === "Admin" ||
    header === "Send"
  );
}

export function StatusBadge({
  label,
  code,
}: {
  label: string;
  code?: string | number;
}) {
  const text = label.trim();

  if (!text || text === "—") {
    return <span className="text-ink-muted">—</span>;
  }

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusToneClass(
        String(code ?? text),
        text,
      )}`}
    >
      {text}
    </span>
  );
}

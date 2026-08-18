const SUCCESS = new Set([
  "published",
  "verified",
  "completed",
  "sold",
  "consumed",
  "paid",
  "sent at settlement",
  "enabled",
  "read",
]);

const WARNING = new Set([
  "pending approval",
  "pending verification",
  "unverified",
  "awaiting payment",
  "awaiting compliance",
  "awaiting transfer",
  "awaiting settlement",
  "reserved",
  "active",
  "pending",
  "bank debit processing",
  "held until settlement",
  "not yet",
  "unread",
]);

const DANGER = new Set([
  "cancelled",
  "rejected",
  "unsold",
  "released",
  "expired",
  "failed",
  "disabled",
]);

const INFO = new Set(["platform admin"]);

function normalizeStatus(value: string) {
  return value.trim().toLowerCase().replace(/_/g, " ");
}

function toneClass(value: string) {
  const key = normalizeStatus(value);

  if (SUCCESS.has(key)) {
    return "bg-sea/15 text-sea";
  }

  if (WARNING.has(key)) {
    return "bg-amber-100 text-amber-900";
  }

  if (DANGER.has(key)) {
    return "bg-red-100 text-red-800";
  }

  if (INFO.has(key)) {
    return "bg-sky-100 text-sky-900";
  }

  return "bg-paper-stripe text-ink-muted";
}

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
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${toneClass(
        String(code ?? text),
      )}`}
    >
      {text}
    </span>
  );
}

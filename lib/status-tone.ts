const SUCCESS = new Set([
  "live",
  "published",
  "verified",
  "completed",
  "sold",
  "consumed",
  "paid",
  "sent at settlement",
  "enabled",
  "read",
  "yes",
]);

const ACTION = new Set([
  "awaiting payment",
  "action required",
  "waiting for application",
  "waiting for seller to sign",
  "waiting for buyer to sign",
  "ended",
  "ended waiting to close",
  "unread",
]);

const WAITING = new Set([
  "pending approval",
  "pending verification",
  "unverified",
  "awaiting compliance",
  "awaiting transfer",
  "awaiting settlement",
  "reserved",
  "active",
  "pending",
  "bank debit processing",
  "held until settlement",
  "not yet",
  "scheduled",
  "checking seller signed form",
  "reviewing completed pack",
  "with fisheries queensland",
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

export const ACTION_STATUS_TONE_CLASS = "bg-amber-200 text-amber-900";

function normalizeStatus(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[—–·•-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isActionStatus(key: string) {
  if (ACTION.has(key)) {
    return true;
  }

  return (
    key.startsWith("1 of 6") ||
    key.startsWith("2 of 6") ||
    key.startsWith("4 of 6")
  );
}

export function statusToneClass(value: string, displayLabel?: string) {
  const keys = [normalizeStatus(value)];
  if (displayLabel) {
    keys.push(normalizeStatus(displayLabel));
  }

  if (keys.some(isActionStatus)) {
    return ACTION_STATUS_TONE_CLASS;
  }

  if (keys.some((key) => SUCCESS.has(key))) {
    return "bg-sea/15 text-sea";
  }

  if (keys.some((key) => WAITING.has(key) || key.startsWith("3 of 6") || key.startsWith("5 of 6") || key.startsWith("6 of 6"))) {
    return "bg-line text-ink";
  }

  if (keys.some((key) => DANGER.has(key))) {
    return "bg-ink text-paper";
  }

  if (keys.some((key) => INFO.has(key))) {
    return "bg-paper-stripe text-sea";
  }

  return "bg-paper-stripe text-ink-muted";
}

import { ActionNotice } from "@/components/notices";

export function BusinessDetailsRequiredNotice({
  action,
  missingLabels,
}: {
  action: "buy" | "bid" | "list" | "trade";
  missingLabels?: readonly string[];
}) {
  const label =
    action === "list"
      ? "list quota"
      : action === "bid"
        ? "bid"
        : action === "trade"
          ? "buy or list quota"
          : "buy";
  const missing =
    missingLabels && missingLabels.length > 0
      ? ` Missing: ${missingLabels.join(", ")}.`
      : "";

  return (
    <ActionNotice
      title="Complete business details"
      href="/dashboard/account"
      actionLabel="Go to Business Settings"
    >
      Complete the required fields on Business Settings → Details before you
      can {label}.{missing}
    </ActionNotice>
  );
}

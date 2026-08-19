import { ActionNotice } from "@/components/notices";

export function TermsRequiredNotice({
  action,
}: {
  action: "buy" | "bid" | "list";
}) {
  const label =
    action === "list" ? "list quota" : action === "bid" ? "bid" : "buy";

  return (
    <ActionNotice
      title="Agree to the terms"
      href="/dashboard"
      actionLabel="Go to Overview"
    >
      Agree to the terms of service on Overview before you can {label}.
    </ActionNotice>
  );
}

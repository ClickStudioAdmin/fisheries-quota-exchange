import Link from "next/link";

export function TermsRequiredNotice({
  action,
}: {
  action: "buy" | "bid" | "list";
}) {
  const label =
    action === "list"
      ? "list quota"
      : action === "bid"
        ? "bid"
        : "buy";

  return (
    <p className="text-sm text-ink-muted">
      Agree to the{" "}
      <Link href="/terms" className="underline">
        terms of service
      </Link>{" "}
      on Overview before you can {label}.{" "}
      <Link href="/dashboard" className="underline">
        Go to Overview
      </Link>
    </p>
  );
}

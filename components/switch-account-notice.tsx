import { selectAccountAction } from "@/lib/organisations/select-account";
import { buttonClassName } from "@/components/auth-card";
import { selectAccountPath } from "@/lib/organisations/active-account";
import Link from "next/link";

export function SwitchAccountNotice({
  organisationId,
  organisationName,
  next,
}: {
  organisationId: number;
  organisationName: string;
  next: string;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-ink-muted">
        This belongs to {organisationName}. Switch to that account to continue.
        FQX does not change account automatically.
      </p>
      <form action={selectAccountAction}>
        <input type="hidden" name="organisation_id" value={organisationId} />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className={buttonClassName}>
          Switch to {organisationName}
        </button>
      </form>
    </div>
  );
}

export function SwitchAccountLink({
  next,
  children = "Switch account",
}: {
  next: string;
  children?: string;
}) {
  return (
    <Link href={selectAccountPath(next)} className="underline">
      {children}
    </Link>
  );
}

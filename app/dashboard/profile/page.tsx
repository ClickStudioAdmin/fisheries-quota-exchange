import Link from "next/link";
import { AccountPaymentsSection } from "@/components/account-payments";
import {
  AccountMembersSection,
  AccountProfileSection,
  AccountSecuritySection,
} from "@/components/account-sections";
import { resolveDashboardAccount } from "@/lib/organisations/dashboard-account";
import { accountPath, accountPaymentsPath } from "@/lib/organisations/paths";

export const metadata = {
  title: "Account details",
};

function tabClassName(active: boolean) {
  return active
    ? "-mb-px inline-flex items-center gap-1.5 border-b-2 border-sea pb-2 font-medium text-ink"
    : "inline-flex items-center gap-1.5 pb-2 text-ink-muted hover:text-ink";
}

export default async function DashboardProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const account = await resolveDashboardAccount(
    params.account,
    "/dashboard/profile",
  );
  const tab =
    params.tab === "security" ||
    params.tab === "members" ||
    params.tab === "payments"
      ? params.tab
      : "profile";
  const organisationId = account.selected?.id ?? null;
  const profileHref = organisationId
    ? accountPath(organisationId, "/dashboard/profile")
    : "/dashboard/profile";
  const securityHref = organisationId
    ? accountPath(organisationId, "/dashboard/profile", { tab: "security" })
    : "/dashboard/profile?tab=security";
  const membersHref = organisationId
    ? accountPath(organisationId, "/dashboard/profile", { tab: "members" })
    : "/dashboard/profile?tab=members";
  const paymentsHref = accountPaymentsPath(organisationId);

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Account details
        </h1>
      <nav aria-label="Account details sections">
        <ul className="flex flex-wrap gap-x-6 border-b border-line">
          <li>
            <Link
              href={profileHref}
              className={tabClassName(tab === "profile")}
              aria-current={tab === "profile" ? "page" : undefined}
            >
              Profile
            </Link>
          </li>
          <li>
            <Link
              href={securityHref}
              className={tabClassName(tab === "security")}
              aria-current={tab === "security" ? "page" : undefined}
            >
              Password and security
            </Link>
          </li>
          <li>
            <Link
              href={membersHref}
              className={tabClassName(tab === "members")}
              aria-current={tab === "members" ? "page" : undefined}
            >
              Members
            </Link>
          </li>
          <li>
            <Link
              href={paymentsHref}
              className={tabClassName(tab === "payments")}
              aria-current={tab === "payments" ? "page" : undefined}
            >
              Payments
            </Link>
          </li>
        </ul>
      </nav>
      {tab === "security" ? (
        <AccountSecuritySection />
      ) : tab === "members" ? (
        organisationId ? (
          <AccountMembersSection
            organisationId={organisationId}
            userEmail={account.user.email ?? ""}
          />
        ) : (
          <p className="text-sm text-ink-muted">
            Add your business details on the Profile tab before you can manage
            members.
          </p>
        )
      ) : tab === "payments" ? (
        organisationId && account.selected ? (
          <AccountPaymentsSection
            organisationId={organisationId}
            role={account.selected.role}
          />
        ) : (
          <p className="text-sm text-ink-muted">
            Add your business details on the Profile tab before connecting
            Stripe payments.
          </p>
        )
      ) : (
        <AccountProfileSection
          organisationId={organisationId}
          user={account.user}
        />
      )}
    </div>
  );
}

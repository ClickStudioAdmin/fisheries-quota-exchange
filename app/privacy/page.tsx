import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="18 August 2026">
      <LegalSection title="About this notice">
        <p>
          This notice describes how Fisheries Quota Exchange (FQX) handles
          personal information on this development site. FQX is operated by
          Click Studio. This is not a live market. These practices will be
          reviewed again before any production launch.
        </p>
        <p>
          If you are taking part in testing, treat any data you enter as real
          enough to protect, and do not submit other people’s information unless
          they have agreed.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>Depending on how you use the site, we may collect:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name, email address, and login credentials</li>
          <li>
            Organisation details: legal name, trading name, and ABN
          </li>
          <li>
            Membership and role information for accounts you belong to
          </li>
          <li>
            Quota Holdings, listings, bids, orders, and related audit records
          </li>
          <li>
            Payment records needed to take test payments and settle trades
            (including Stripe account and payment identifiers). Card and bank
            account numbers are collected by Stripe, not stored by FQX
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>We use this information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Create and administer accounts</li>
          <li>Operate the marketplace, auctions, and settlement workflows</li>
          <li>Take test-mode payments and record payment status from Stripe</li>
          <li>Send transactional email (for example when a person is added to
            an account, or when an order settles)</li>
          <li>Let platform administrators review holdings, listings, and orders</li>
          <li>Keep the site secure and investigate misuse</li>
        </ul>
        <p>We do not sell personal information.</p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <p>
          We use service providers to run the site. They only receive what they
          need to provide that service:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase — authentication and database hosting</li>
          <li>Stripe — Connect onboarding, Checkout, and test payments</li>
          <li>Resend — transactional email</li>
          <li>Vercel — application hosting</li>
        </ul>
        <p>
          Platform administrators can see account, holding, listing, and order
          information as part of operating this environment. Other members of
          an organisation can see information for that account according to
          their role.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and session">
        <p>
          We use necessary cookies and similar storage to keep you signed in and
          to run the site. We do not use advertising cookies on this
          development site.
        </p>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          Account, quota, order, and payment records are kept so the marketplace
          and ledger can function. Quota ledger rows are not deleted. Dummy tax
          invoices are generated when requested and are not stored as files.
        </p>
      </LegalSection>

      <LegalSection title="Access and contact">
        <p>
          If you need a copy of your information, a correction, or an account
          removed from this test environment, use the{" "}
          <Link href="/contact" className="underline">
            Contact us
          </Link>{" "}
          page. For testers, you can also contact the person who invited you.
        </p>
        <p>
          Using this site is also subject to the{" "}
          <Link href="/terms" className="underline">
            Terms of service
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

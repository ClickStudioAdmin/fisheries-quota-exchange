import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Terms of service",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="18 August 2026">
      <LegalSection title="About these terms">
        <p>
          These terms cover use of the Fisheries Quota Exchange (FQX)
          development site, operated by Click Studio. This is a test
          environment, not a live market. Nothing on this site is an offer to
          buy or sell quota in a production market, and dummy tax invoices are
          not real tax invoices.
        </p>
        <p>
          By creating an account or using the site you agree to these terms. If
          you do not agree, do not use the site.
        </p>
      </LegalSection>

      <LegalSection title="The service">
        <p>
          FQX is being built as a marketplace for Australian Commonwealth, state
          and territory commercial fisheries quota. On this site you may
          register an organisation, record holdings, list quota, bid in English
          auctions, and run test purchases.
        </p>
        <p>
          Payments, where enabled, run in Stripe test mode only. FQX does not
          take live charges, pay sellers to a bank account, or run refund or
          chargeback workflows on this site.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          You must provide accurate details for yourself and your organisation,
          including legal name, trading name, and ABN where collected. You may
          own one organisation. Others may add you to their organisation with a
          role they assign.
        </p>
        <p>
          You are responsible for activity under your login and for people you
          add to your account. Keep credentials confidential.
        </p>
      </LegalSection>

      <LegalSection title="Listings, purchases, and settlement">
        <p>
          Holdings must be verified before they can be listed. Listings wait for
          approval unless the account is set to auto-publish. A purchase
          reserves quota so it cannot be sold twice. Auction bids and close
          times use server time, not your browser.
        </p>
        <p>
          Buyers pay FQX the listed amount (and, for cards, Stripe’s Australian
          domestic processing surcharge). The platform fee is deducted from the
          seller’s proceeds. FQX holds funds until settlement. Payment status,
          bid validity, and quota availability are determined on the server, not
          by the browser.
        </p>
        <p>
          After simulated settlement, quota ledger entries are written and are
          not edited in place. Two dummy tax invoices can be generated: one for
          the quota (seller to buyer) and one for the platform fee (FQX to
          seller). GST is not calculated.
        </p>
        <p>
          Platform administrators may approve, reject, or cancel items, and may
          simulate transfer and settlement, as part of operating this
          environment.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Use the site only for testing and development of FQX. Do not attempt
          to circumvent access controls, interfere with other users, or submit
          unlawful or misleading information. Do not treat test payments,
          listings, or invoices as live commercial documents.
        </p>
      </LegalSection>

      <LegalSection title="No warranties">
        <p>
          The site is provided as a development environment, without warranties
          of any kind. Features may change, data may be reset, and the service
          may be unavailable. Do not rely on this site for production trading,
          legal, tax, or regulatory outcomes.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          To the extent permitted by Australian law, Click Studio and FQX are
          not liable for loss arising from use of this development site,
          including lost quota, failed test payments, or decisions you make
          based on data shown here. Nothing in these terms excludes liability
          that cannot be excluded by law.
        </p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          How we handle personal information is described in the{" "}
          <Link href="/privacy" className="underline">
            Privacy policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update these terms as the product develops. The date at the
          top of this page is the current version. Continued use after a change
          means you accept the updated terms.
        </p>
        <p>
          Questions about these terms can go through{" "}
          <Link href="/contact" className="underline">
            Contact us
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

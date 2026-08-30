import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/page-intro";
import { TERMS_UPDATED_LABEL } from "@/lib/terms/version";

export const metadata: Metadata = {
  title: "Terms of service",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated={TERMS_UPDATED_LABEL}>
      <LegalSection title="About these terms">
        <p>
          These terms cover use of Fisheries Quota Exchange (FQX), operated by
          Click Studio. They apply to every person with a login. You must read
          and agree before you buy, bid, or list quota. Agreement is recorded
          against your account. Browsing the site is not agreement.
        </p>
        <p>
          This is a development site. Payments currently run in Stripe test
          mode, and some settlement steps are still operated by FQX staff. The
          buyer and seller rules below are still the rules you agree to. Dummy
          tax invoices are not real tax invoices.
        </p>
      </LegalSection>

      <LegalSection title="Buyers">
        <p>
          When you click Purchase Now, or when you place a bid that wins an
          auction, you enter a binding agreement to complete that trade.
        </p>
        <p>That means you must:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Pay FQX the listed amount. If you pay by Australian-issued card,
            you also pay Stripe’s card processing surcharge. You do not pay
            the platform commission on top of the listed amount when the trade
            completes.
          </li>
          <li>
            Complete buyer steps through to settlement: payment, then wait for
            compliance and quota transfer.
          </li>
          <li>
            Not treat the browser, a return URL, or an unpaid checkout as
            proof that the trade is finished.
          </li>
        </ul>
        <p>
          You cannot walk away after you buy or win. If you do not proceed —
          including if you do not pay, or you otherwise refuse to complete the
          purchase — you may be liable to pay FQX the platform commission
          that would have applied to that trade. Changing your mind does not
          cancel that commission.
        </p>
      </LegalSection>

      <LegalSection title="Bidders">
        <p>
          Bid time is recorded by the server, not your browser. The time on
          your device is not used to decide whether a bid is in time or is
          the highest bid.
        </p>
        <p>
          If you win (at or above reserve), you enter a binding agreement to
          complete the trade, quota is reserved, and you must pay FQX.
        </p>
        <p>
          If you do not proceed after winning, you may be liable to pay FQX
          the platform commission that would have applied to this trade.
        </p>
      </LegalSection>

      <LegalSection title="Sellers">
        <p>
          When you list quota for sale or lease, including by auction, you
          offer that quota on these terms. When a buyer purchases, or an
          auction is won, you enter a binding agreement to complete that
          trade.
        </p>
        <p>That means you must:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Only list quota you are entitled to transfer from a verified
            holding.
          </li>
          <li>
            Complete seller steps through to settlement: keep the reserved
            quota available, complete the authority transfer, and accept
            settlement of the listed amount minus the platform commission.
          </li>
        </ul>
        <p>
          You cannot withdraw after a buyer has committed (a purchase or a
          winning bid) in order to avoid the trade. If you do not proceed, you
          may be liable to pay FQX the platform commission that would have
          applied to that trade. Changing your mind does not cancel that
          commission.
        </p>
        <p>
          On a completed trade, the buyer pays FQX the listed amount. FQX
          deducts the platform commission from you and pays you the rest.
          The buyer does not pay that commission on top.
        </p>
      </LegalSection>

      <LegalSection title="Platform commission">
        <p>
          Platform commission is the published sale fee or lease fee for the
          offering (a percentage of the listed quota amount). It is shown when
          you list or buy.
        </p>
        <p>
          If the trade completes, FQX takes that commission from the seller’s
          proceeds.
        </p>
        <p>
          If either side does not complete a trade they have already entered —
          the buyer after purchase or a winning bid, or the seller after a
          buyer has committed — the side that does not proceed may be liable
          to pay FQX the same commission. FQX may invoice that party for it.
          That obligation is part of these terms, not an optional extra.
        </p>
      </LegalSection>

      <LegalSection title="How trading works">
        <p>
          Holdings must be verified before they can be listed. Listings wait
          for approval unless the business is set to auto-publish. A purchase
          reserves quota so it cannot be sold twice.
        </p>
        <p>
          FQX holds buyer funds until settlement. Payment status, bid
          validity, and quota availability are determined on the server, not
          by the browser.
        </p>
        <p>
          After settlement, quota ledger entries are written and are not
          edited in place. Two dummy tax invoices can be generated: quota
          (seller to buyer) and platform commission (FQX to seller). GST is
          not calculated.
        </p>
        <p>
          Platform administrators may approve, reject, or cancel items, and
          may run transfer and settlement, as part of operating this
          environment. Admin action does not remove a commission that these
          terms already made payable because a party did not proceed.
        </p>
      </LegalSection>

      <LegalSection title="Your account and businesses">
        <p>
          Provide accurate details for yourself. Add your business on
          Business Settings (legal name, and trading name and ABN where collected)
          before you buy, bid, or list. You may own one business. Others may
          add you to their business with a role they assign.
        </p>
        <p>
          You are responsible for activity under your login and for people you
          add to your business. Every person who buys, bids, or lists must
          agree to these terms themselves. An owner’s agreement does not cover
          a member.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Do not circumvent access controls, interfere with other users, or
          submit unlawful or misleading information. Do not treat test
          payments or dummy invoices as live commercial tax documents.
        </p>
      </LegalSection>

      <LegalSection title="No warranties">
        <p>
          Except for the buyer, seller, and commission obligations in these
          terms, the site is provided without other warranties. Features may
          change and the service may be unavailable. Nothing in these terms
          excludes liability that cannot be excluded by Australian law.
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
          top of this page is the current version. If the version changes, you
          must agree again before you can buy, bid, or list.
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

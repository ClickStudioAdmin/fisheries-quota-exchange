import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/auth-card";
import { InfoPage } from "@/components/page-intro";
import { registrationsAllowed } from "@/lib/settings/queries";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "How does it work",
};

const outlineButtonClassName =
  "border border-line bg-paper-raised px-4 py-2 text-sm font-medium text-ink hover:border-sea";

const BUYER_STEPS = [
  {
    title: "Create an account",
    body: "Register your organisation. You buy as that account, not as a personal shopper.",
  },
  {
    title: "Find quota",
    body: "Browse the marketplace and fisheries. Fixed-price sales and leases sit alongside English auctions.",
  },
  {
    title: "Buy or bid",
    body: "A purchase reserves the quota so it cannot be sold twice. Auction bids and close times use server time, not your browser clock.",
  },
  {
    title: "Pay FQX",
    body: "Pay the listed amount by Australian bank debit, or pay by Australian-issued card (the listed amount plus Stripe’s card processing). FQX holds the funds. You do not pay the platform fee on top.",
  },
  {
    title: "Wait for settlement",
    body: "FQX runs compliance, then the quota transfer. When settlement completes, the quota is on your ledger and you can download the quota tax invoice.",
  },
];

const SELLER_STEPS = [
  {
    title: "Create an account",
    body: "Register your organisation, then complete payments setup so FQX can pay you at settlement.",
  },
  {
    title: "Record holdings",
    body: "Add the quota you hold in each fishery. Holdings must be verified before you can list them.",
  },
  {
    title: "List quota",
    body: "Publish a fixed-price sale or lease, or run an English auction. Listings wait for approval unless your account is set to auto-publish.",
  },
  {
    title: "Buyer pays FQX",
    body: "The buyer pays FQX the listed amount. FQX holds the funds until settlement. The platform fee comes out of your proceeds, not added on top for the buyer.",
  },
  {
    title: "Settle the trade",
    body: "After compliance and transfer, settlement moves quota to the buyer and pays you the listed amount minus the platform fee. You can download the quota invoice and the fee invoice.",
  },
];

function Steps({
  heading,
  steps,
}: {
  heading: string;
  steps: { title: string; body: string }[];
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {heading}
      </h2>
      <ol className="mt-6 divide-y divide-line">
        {steps.map((step, index) => (
          <li key={step.title} className="py-5 first:pt-0 last:pb-0">
            <p className="text-xs uppercase tracking-[0.12em] text-sea">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function HowItWorksPage() {
  const [user, allowRegister] = await Promise.all([
    getUser(),
    registrationsAllowed(),
  ]);

  return (
    <InfoPage
      title="How does it work"
      lead={
        <p>
          Fisheries Quota Exchange is a marketplace for Australian Commonwealth,
          state and territory quota. Buyers and sellers each follow a short path
          from account through payment to settlement. This is a development
          site, not a live market.
        </p>
      }
      actions={
        <>
          <Link href="/marketplace" className={buttonClassName}>
            Browse marketplace
          </Link>
          {user ? (
            <Link href="/dashboard" className={outlineButtonClassName}>
              Dashboard
            </Link>
          ) : allowRegister ? (
            <Link href="/register" className={outlineButtonClassName}>
              Register
            </Link>
          ) : (
            <Link href="/login" className={outlineButtonClassName}>
              Log in
            </Link>
          )}
        </>
      }
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-line">
        <div className="lg:pr-12">
          <Steps heading="For buyers" steps={BUYER_STEPS} />
        </div>
        <div className="lg:pl-12">
          <Steps heading="For sellers" steps={SELLER_STEPS} />
        </div>
      </div>
    </InfoPage>
  );
}

import type { Metadata } from "next";
import { pageWidthClassName } from "@/components/surface";
import {
  HOW_IT_WORKS_BUYER_STEPS,
  HOW_IT_WORKS_SELLER_STEPS,
} from "@/lib/content/how-it-works";

export const metadata: Metadata = {
  title: "How it works",
};

function Steps({
  heading,
  steps,
}: {
  heading: string;
  steps: { title: string; body: string }[];
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-ink">
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

export default function HowItWorksPage() {
  return (
    <div className={`${pageWidthClassName} py-12 sm:py-16`}>
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          How it works
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
          Fisheries Quota Exchange is a marketplace for Australian Commonwealth,
          state and territory quota. Buyers and sellers each follow a short path
          from account through payment to settlement. This is a development
          site, not a live market. Payments run in Stripe test mode.
        </p>
        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Steps heading="For buyers" steps={HOW_IT_WORKS_BUYER_STEPS} />
          <Steps heading="For sellers" steps={HOW_IT_WORKS_SELLER_STEPS} />
        </div>
      </div>
    </div>
  );
}

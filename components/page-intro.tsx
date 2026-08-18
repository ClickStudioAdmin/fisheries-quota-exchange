import type { ReactNode } from "react";
import { pageWidthClassName } from "@/components/surface";

type PageIntroProps = {
  title: string;
  children: ReactNode;
};

export function PageIntro({ title, children }: PageIntroProps) {
  return (
    <div className={`${pageWidthClassName} py-12 sm:py-16`}>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <div className="mt-4 max-w-2xl space-y-3 text-base leading-relaxed text-ink-muted">
        {children}
      </div>
    </div>
  );
}

export function InfoPage({
  title,
  lead,
  meta,
  actions,
  width = "wide",
  children,
}: {
  title: string;
  lead?: ReactNode;
  meta?: string;
  actions?: ReactNode;
  width?: "wide" | "document";
  children: ReactNode;
}) {
  const panelWidth = width === "document" ? "mx-auto max-w-3xl" : "w-full";

  return (
    <div>
      <section className="border-b border-line bg-paper-stripe">
        <div className={`${pageWidthClassName} py-10 sm:py-14`}>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          {meta ? <p className="mt-2 text-sm text-ink-muted">{meta}</p> : null}
          {lead ? (
            <div className="mt-4 max-w-2xl space-y-3 text-base leading-relaxed text-ink-muted">
              {lead}
            </div>
          ) : null}
          {actions ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
      </section>
      <section className={`${pageWidthClassName} py-10 sm:py-14`}>
        <div
          className={`${panelWidth} border border-line bg-paper-raised px-6 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14`}
        >
          {children}
        </div>
      </section>
    </div>
  );
}

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <InfoPage title={title} meta={`Last updated ${updated}`} width="document">
      <div className="text-base leading-relaxed text-ink-muted">{children}</div>
    </InfoPage>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0 last:pb-0">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

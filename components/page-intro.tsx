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
    <div className={`${pageWidthClassName} py-12 sm:py-16`}>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated {updated}</p>
      <div className="mt-8 max-w-2xl space-y-8 text-base leading-relaxed text-ink-muted">
        {children}
      </div>
    </div>
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
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

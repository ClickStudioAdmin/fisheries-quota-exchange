import type { ReactNode } from "react";
import { pageWidthClassName } from "@/components/surface";

type PageIntroProps = {
  title: string;
  children: ReactNode;
  width?: "default" | "article";
};

export function PageIntro({
  title,
  children,
  width = "default",
}: PageIntroProps) {
  return (
    <div className={`${pageWidthClassName} py-12 sm:py-16`}>
      <div className={width === "article" ? "mx-auto max-w-3xl" : undefined}>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <div
          className={`mt-4 space-y-3 text-base leading-relaxed text-ink-muted ${
            width === "article" ? "" : "max-w-2xl"
          }`}
        >
          {children}
        </div>
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
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated {updated}</p>
        <div className="mt-8 text-base leading-relaxed text-ink-muted">
          {children}
        </div>
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
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0 last:pb-0">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

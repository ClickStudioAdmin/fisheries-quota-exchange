import type { ReactNode } from "react";

type PageIntroProps = {
  title: string;
  children: ReactNode;
};

export function PageIntro({ title, children }: PageIntroProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <div className="mt-4 max-w-2xl space-y-3 text-base leading-relaxed text-ink-muted">
        {children}
      </div>
    </div>
  );
}

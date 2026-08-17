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

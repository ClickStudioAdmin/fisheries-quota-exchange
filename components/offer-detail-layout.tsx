import type { ReactNode } from "react";
import { panelClassName } from "@/components/surface";

export function OfferDetailLayout({
  actionTitle,
  action,
  related,
  children,
}: {
  actionTitle: string;
  action: ReactNode;
  related?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-8">{children}</div>
        <aside className={`min-w-0 lg:sticky lg:top-6 ${panelClassName}`}>
          <h2 className="text-lg font-semibold text-ink">{actionTitle}</h2>
          <div className="mt-4">{action}</div>
        </aside>
      </div>
      {related}
    </>
  );
}

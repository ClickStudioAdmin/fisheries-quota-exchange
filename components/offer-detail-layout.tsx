import type { ReactNode } from "react";
import { panelClassName } from "@/components/surface";

export function OfferDetailLayout({
  actionTitle,
  action,
  extra,
  related,
  children,
}: {
  actionTitle: string;
  action: ReactNode;
  extra?: ReactNode;
  related?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex h-full min-w-0 flex-col">{children}</div>
        <aside className={`flex min-w-0 flex-col ${panelClassName}`}>
          <h2 className="text-lg font-semibold text-ink">{actionTitle}</h2>
          <div className="mt-4 flex min-h-0 flex-1 flex-col">{action}</div>
        </aside>
      </div>
      {extra ? <div className="mt-8 space-y-8">{extra}</div> : null}
      {related}
    </>
  );
}

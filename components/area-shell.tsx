import { Suspense, type ReactNode } from "react";
import { AreaNav } from "@/components/area-nav";
import type { SideNavItem } from "@/components/side-nav";
import { pageWidthClassName } from "@/components/surface";

type AreaShellProps = {
  title: string;
  operatingAs?: string | null;
  switchAccountHref?: string | null;
  items: SideNavItem[];
  children: ReactNode;
};

export function AreaShell({
  title,
  operatingAs,
  switchAccountHref,
  items,
  children,
}: AreaShellProps) {
  return (
    <div
      className={`${pageWidthClassName} flex flex-col gap-4 py-6 lg:flex-row lg:gap-8 lg:py-12`}
    >
      <aside className="lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-6">
          <Suspense
            fallback={
              <nav className="border border-line bg-paper-raised p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                  {title}
                </p>
              </nav>
            }
          >
            <AreaNav
              title={title}
              operatingAs={operatingAs}
              switchAccountHref={switchAccountHref}
              items={items}
            />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

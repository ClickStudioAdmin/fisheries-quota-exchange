import type { ReactNode } from "react";
import { SideNav, type SideNavItem } from "@/components/side-nav";

type AreaShellProps = {
  title: string;
  items: SideNavItem[];
  children: ReactNode;
};

export function AreaShell({ title, items, children }: AreaShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:py-12">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-6">
          <SideNav title={title} items={items} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

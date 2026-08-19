import Link from "next/link";

export function dashboardTabClassName(active: boolean) {
  return active
    ? "-mb-px inline-flex items-center gap-1.5 border-b-2 border-sea pb-2 font-medium text-ink"
    : "inline-flex items-center gap-1.5 pb-2 text-ink-muted hover:text-ink";
}

export function DashboardTabs({
  label,
  items,
  active,
}: {
  label: string;
  items: { id: string; href: string; label: string }[];
  active: string;
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-x-6 border-b border-line">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={dashboardTabClassName(active === item.id)}
              aria-current={active === item.id ? "page" : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

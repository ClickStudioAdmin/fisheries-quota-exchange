import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { panelClassName } from "@/components/surface";
import { formatTableDateTime } from "@/lib/format";
import type { InAppNotification } from "@/lib/notifications/types";

export function OverviewNotifications({
  notifications,
}: {
  notifications: InAppNotification[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">
          <Link href="/dashboard/notifications" className="hover:underline">
            Notifications
          </Link>
        </h2>
        <Link href="/dashboard/notifications" className="text-sm underline">
          View inbox
        </Link>
      </div>
      <div className={panelClassName}>
        {notifications.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No in-app notifications yet.{" "}
            <Link href="/dashboard/notifications" className="underline">
              Open inbox
            </Link>
          </p>
        ) : (
          <ul className="-mx-5 -my-5 divide-y divide-line">
            {notifications.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href || "/dashboard/notifications"}
                  className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-paper-stripe"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm text-ink ${item.read_at ? "" : "font-medium"}`}
                    >
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {formatTableDateTime(item.created_at)}
                    </p>
                  </div>
                  <StatusBadge label={item.read_at ? "Read" : "Unread"} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

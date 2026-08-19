import {
  DataTable,
  DataTableRowExtras,
  TableActionRow,
  tableLinkClassName,
} from "@/components/data-table";
import { tableButtonClassName } from "@/components/auth-card";
import {
  markNotificationsReadAction,
  markNotificationsUnreadAction,
  openNotificationAction,
} from "@/lib/notifications/actions";
import { inAppNotificationLinkLabel } from "@/lib/notifications/href";
import type { InAppNotification } from "@/lib/notifications/types";
import { formatTableDateTime } from "@/lib/format";

export function InAppNotificationList({
  notifications,
}: {
  notifications: InAppNotification[];
}) {
  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-ink-muted">
          In-app notices for events you still have switched on.
        </p>
        {unread > 0 ? (
          <form action={markNotificationsReadAction}>
            <input type="hidden" name="scope" value="all" />
            <button type="submit" className={tableButtonClassName}>
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>
      <DataTable
        caption="Inbox"
        empty="No in-app notifications yet."
        searchPlaceholder="Filter notifications…"
        defaultSort={{ key: "when", direction: "desc" }}
        selectable
        bulkActions={[
          {
            label: "Mark as read",
            action: markNotificationsReadAction,
            requireValue: { key: "status", value: "unread" },
          },
          {
            label: "Mark as unread",
            action: markNotificationsUnreadAction,
            requireValue: { key: "status", value: "read" },
          },
        ]}
        columns={[
          { key: "message", header: "Message", sortable: true, details: true },
          { key: "when", header: "When", sortable: true, nowrap: true },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "unread", label: "Unread" },
              { value: "read", label: "Read" },
            ],
          },
        ]}
        rows={notifications.map((item) => ({
          id: item.id,
          values: {
            message: item.title,
            when: item.created_at,
            status: item.read_at ? "read" : "unread",
          },
          display: {
            when: formatTableDateTime(item.created_at),
            status: item.read_at ? "Read" : "Unread",
          },
          details: item.body ? [{ label: "Detail", value: item.body }] : [],
        }))}
      >
        {notifications.map((item) => (
          <DataTableRowExtras
            key={item.id}
            id={item.id}
            links={
              <form action={openNotificationAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="href" value={item.href} />
                <button type="submit" className={tableLinkClassName}>
                  {inAppNotificationLinkLabel(item.template, item.href)}
                </button>
              </form>
            }
            actions={
              <TableActionRow>
                {item.read_at ? (
                  <form action={markNotificationsUnreadAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className={tableButtonClassName}>
                      Mark as unread
                    </button>
                  </form>
                ) : (
                  <form action={markNotificationsReadAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className={tableButtonClassName}>
                      Mark as read
                    </button>
                  </form>
                )}
              </TableActionRow>
            }
          />
        ))}
      </DataTable>
    </div>
  );
}

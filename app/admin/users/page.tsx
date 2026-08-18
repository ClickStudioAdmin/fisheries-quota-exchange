import { redirect } from "next/navigation";
import Link from "next/link";
import {
  DataTable,
  DataTableRowExtras,
  TableActionRow,
  tableLinkClassName,
} from "@/components/data-table";
import { tableButtonClassName } from "@/components/auth-card";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  deleteUsersAction,
  setUserVerifiedAction,
  setUsersVerifiedAction,
} from "@/lib/admin/actions";
import { switchToUserAction } from "@/lib/admin/impersonate-actions";
import { formatTableDate } from "@/lib/format";
import {
  listUsersForAdmin,
} from "@/lib/organisations/admin-queries";
import { adminUserPath } from "@/lib/organisations/paths";
import { organisationRoleLabel } from "@/lib/organisations/types";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Users",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const [{ error }, users, user] = await Promise.all([
    searchParams,
    listUsersForAdmin(),
    getUser(),
  ]);
  const currentEmail = user?.email?.toLowerCase() ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Users
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Verified users can skip holding and listing approval when those
          platform settings are on. Everyone else needs each holding verified
          before they can list or auction quota. Select users to mark as
          verified, revoke verification, or remove them from all accounts.
        </p>
      </div>
      {error === "switch" ? (
        <p className="text-sm text-red-800" role="alert">
          Could not switch to that user. They need an existing login account,
          and you cannot switch while already viewing as someone else.
        </p>
      ) : null}
      <DataTable
        caption="Users"
        empty="No users yet."
        searchPlaceholder="Filter users…"
        defaultSort={{ key: "name", direction: "asc" }}
        selectable
        lockedIds={currentEmail ? [currentEmail] : []}
        bulkActions={[
          {
            label: "Mark as verified",
            action: setUsersVerifiedAction,
            fieldName: "emails",
            hiddenFields: { verified: "true" },
            confirm: "Mark the selected users as verified?",
          },
          {
            label: "Revoke verification",
            action: setUsersVerifiedAction,
            fieldName: "emails",
            hiddenFields: { verified: "false" },
            confirm: "Revoke verification from the selected users?",
          },
          {
            label: "Delete selected",
            action: deleteUsersAction,
            fieldName: "emails",
            confirm:
              "Delete the selected users? They will be removed from all accounts. Organisations and quota records stay in place.",
          },
        ]}
        columns={[
          { key: "id", header: "ID", sortable: true },
          { key: "name", header: "Name", sortable: true, details: true, nowrap: true },
          { key: "email", header: "Email", sortable: true, nowrap: true },
          {
            key: "listings",
            header: "Listings",
            sortable: true,
            align: "right",
          },
          {
            key: "orders",
            header: "Orders",
            sortable: true,
            align: "right",
          },
          {
            key: "verified",
            header: "Verified",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "Verified", label: "Verified" },
              { value: "Unverified", label: "Unverified" },
            ],
          },
        ]}
        rows={users.map((item) => {
          const accountLines = item.memberships.map(
            (membership) =>
              `${membership.organisation} (${organisationRoleLabel(membership.role)})`,
          );

          return {
            id: item.email,
            details: [
              ...(item.phone
                ? [{ label: "Phone", value: item.phone }]
                : []),
              ...(item.platformAdmin
                ? [{ label: "Access", value: "Platform admin" }]
                : []),
              {
                label: "Accounts",
                value: accountLines.length > 0 ? accountLines.join("\n") : "—",
              },
              {
                label: "Joined",
                value: item.joinedAt ? formatTableDate(item.joinedAt) : "—",
              },
            ],
            values: {
              id: item.id ?? "",
              name: item.fullName || item.email,
              email: item.email,
              accounts: accountLines.join(", "),
              listings: item.listingCount,
              orders: item.orderCount,
              access: item.platformAdmin ? "Platform admin" : "User",
              verified: item.verified ? "Verified" : "Unverified",
              joined: item.joinedAt ?? "",
            },
            display: {
              id: item.id != null ? String(item.id) : "—",
              name: item.fullName ?? "—",
              email:
                item.email === currentEmail ? `${item.email} (you)` : item.email,
            },
          };
        })}
      >
        {users.map((item) => (
          <DataTableRowExtras
            key={item.email}
            id={item.email}
            links={
              <Link
                href={adminUserPath(item.email)}
                target="_blank"
                rel="noopener noreferrer"
                className={tableLinkClassName}
              >
                Details
              </Link>
            }
            actions={
              <TableActionRow>
                {item.email !== currentEmail ? (
                  <form action={switchToUserAction}>
                    <input type="hidden" name="email" value={item.email} />
                    <button type="submit" className={tableButtonClassName}>
                      Switch to User
                    </button>
                  </form>
                ) : null}
                <form action={setUserVerifiedAction}>
                  <input type="hidden" name="email" value={item.email} />
                  <input
                    type="hidden"
                    name="verified"
                    value={item.verified ? "false" : "true"}
                  />
                  <button type="submit" className={tableButtonClassName}>
                    {item.verified ? "Revoke verification" : "Mark as verified"}
                  </button>
                </form>
              </TableActionRow>
            }
          />
        ))}
      </DataTable>
    </div>
  );
}

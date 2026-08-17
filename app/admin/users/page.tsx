import { redirect } from "next/navigation";
import Link from "next/link";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { tableButtonClassName, tableSecondaryButtonClassName } from "@/components/auth-card";
import { isPlatformAdmin } from "@/lib/admin/access";
import { deleteUsersAction, setUserVerifiedAction } from "@/lib/admin/actions";
import { formatTableDate } from "@/lib/format";
import {
  adminUserRole,
  listUsersForAdmin,
} from "@/lib/organisations/admin-queries";
import { adminUserPath } from "@/lib/organisations/paths";
import { organisationRoleLabel } from "@/lib/organisations/types";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Users",
};

function accountLabel(names: string[]) {
  if (names.length === 0) {
    return "—";
  }

  if (names.length === 1) {
    return names[0];
  }

  return `${names.length} · ${names.join(", ")}`;
}

export default async function AdminUsersPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const [users, user] = await Promise.all([
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
          before they can list or auction quota. Select users to remove them
          from all accounts.
        </p>
      </div>
      <DataTable
        caption="Users"
        empty="No users yet."
        searchPlaceholder="Filter users…"
        defaultSort={{ key: "name", direction: "asc" }}
        selectable
        lockedIds={currentEmail ? [currentEmail] : []}
        bulkAction={{
          label: "Delete selected",
          action: deleteUsersAction,
          fieldName: "emails",
          confirm:
            "Delete the selected users? They will be removed from all accounts. Organisations and quota records stay in place.",
        }}
        columns={[
          { key: "name", header: "Name", sortable: true },
          { key: "email", header: "Email", sortable: true },
          {
            key: "role",
            header: "Role",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "OWNER", label: "Owner" },
              { value: "ADMIN", label: "Admin" },
              { value: "MEMBER", label: "Member" },
            ],
          },
          { key: "accounts", header: "Accounts", sortable: true },
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
            key: "access",
            header: "Access",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "Platform admin", label: "Platform admin" },
              { value: "User", label: "User" },
            ],
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
          { key: "joined", header: "Joined", sortable: true },
        ]}
        rows={users.map((item) => {
          const role = adminUserRole(item);
          const accountNames = item.memberships.map(
            (membership) => membership.organisation,
          );

          return {
            id: item.email,
            values: {
              name: item.fullName || item.email,
              email: item.email,
              role: role ?? "",
              accounts: accountNames.join(", "),
              listings: item.listingCount,
              orders: item.orderCount,
              access: item.platformAdmin ? "Platform admin" : "User",
              verified: item.verified ? "Verified" : "Unverified",
              joined: item.joinedAt ?? "",
            },
            display: {
              name: item.fullName ?? "—",
              email:
                item.email === currentEmail ? `${item.email} (you)` : item.email,
              role: role ? organisationRoleLabel(role) : "—",
              accounts: accountLabel(accountNames),
              joined: item.joinedAt ? formatTableDate(item.joinedAt) : "—",
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
              <form action={setUserVerifiedAction}>
                <input type="hidden" name="email" value={item.email} />
                <input
                  type="hidden"
                  name="verified"
                  value={item.verified ? "false" : "true"}
                />
                <button
                  type="submit"
                  className={
                    item.verified
                      ? tableSecondaryButtonClassName
                      : tableButtonClassName
                  }
                >
                  {item.verified ? "Revoke verification" : "Mark as verified"}
                </button>
              </form>
            }
          />
        ))}
      </DataTable>
    </div>
  );
}

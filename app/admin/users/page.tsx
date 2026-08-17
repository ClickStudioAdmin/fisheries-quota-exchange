import { redirect } from "next/navigation";
import { DataTable, DataTableRowExtras } from "@/components/data-table";
import { tableButtonClassName, tableSecondaryButtonClassName } from "@/components/auth-card";
import { isPlatformAdmin } from "@/lib/admin/access";
import { deleteUsersAction, setUserVerifiedAction } from "@/lib/admin/actions";
import { listUsersForAdmin } from "@/lib/organisations/admin-queries";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Users",
};

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
          Verified users can create and change holdings without waiting for
          admin approval. Everyone else needs each holding verified before they
          can list or auction quota. Select users to remove them from all
          accounts.
        </p>
      </div>
      <DataTable
        caption="Users"
        empty="No users yet."
        searchPlaceholder="Filter users…"
        defaultSort={{ key: "email", direction: "asc" }}
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
          { key: "email", header: "Email", sortable: true },
          { key: "accounts", header: "Accounts", sortable: true },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "Verified", label: "Verified" },
              { value: "Unverified", label: "Unverified" },
            ],
          },
        ]}
        rows={users.map((item) => ({
          id: item.email,
          values: {
            email: item.email,
            accounts: item.accounts.join(", "),
            status: item.verified ? "Verified" : "Unverified",
          },
          display: {
            accounts: item.accounts.join(", ") || "—",
          },
        }))}
      >
        {users.map((item) => (
          <DataTableRowExtras
            key={item.email}
            id={item.email}
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

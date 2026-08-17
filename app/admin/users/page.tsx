import { redirect } from "next/navigation";
import { DataTable, DataTableRowExtras } from "@/components/data-table";
import { tableButtonClassName, tableSecondaryButtonClassName } from "@/components/auth-card";
import { isPlatformAdmin } from "@/lib/admin/access";
import { setUserVerifiedAction } from "@/lib/admin/actions";
import { listUsersForAdmin } from "@/lib/organisations/admin-queries";

export const metadata = {
  title: "Users",
};

export default async function AdminUsersPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const users = await listUsersForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Users
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Verified users can create and change holdings without waiting for
          admin approval. Everyone else needs each holding verified before they
          can list or auction quota.
        </p>
      </div>
      <DataTable
        caption="Users"
        empty="No users yet."
        searchPlaceholder="Filter users…"
        defaultSort={{ key: "email", direction: "asc" }}
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
        rows={users.map((user) => ({
          id: user.email,
          values: {
            email: user.email,
            accounts: user.accounts.join(", "),
            status: user.verified ? "Verified" : "Unverified",
          },
          display: {
            accounts: user.accounts.join(", ") || "—",
          },
        }))}
      >
        {users.map((user) => (
          <DataTableRowExtras
            key={user.email}
            id={user.email}
            actions={
              <form action={setUserVerifiedAction}>
                <input type="hidden" name="email" value={user.email} />
                <input
                  type="hidden"
                  name="verified"
                  value={user.verified ? "false" : "true"}
                />
                <button
                  type="submit"
                  className={
                    user.verified
                      ? tableSecondaryButtonClassName
                      : tableButtonClassName
                  }
                >
                  {user.verified ? "Revoke verification" : "Mark as verified"}
                </button>
              </form>
            }
          />
        ))}
      </DataTable>
    </div>
  );
}
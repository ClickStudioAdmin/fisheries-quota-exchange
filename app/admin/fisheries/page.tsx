import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCreateForm } from "@/components/admin-create-form";
import { DataTable } from "@/components/data-table";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createFisheryAction } from "@/lib/fisheries/actions";
import { listAuthorities, listFisheries } from "@/lib/fisheries/queries";

export const metadata = {
  title: "Fisheries",
};

export default async function FisheriesAdminPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const authorities = await listAuthorities();
  const fisheries = await listFisheries();

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Fisheries
      </h1>
      <DataTable
        caption="Fisheries"
        empty="No fisheries yet. Create an authority first if needed."
        searchPlaceholder="Filter fisheries…"
        defaultSort={{ key: "name", direction: "asc" }}
        columns={[
          { key: "name", header: "Name", sortable: true },
          { key: "code", header: "Code", sortable: true },
          {
            key: "authority",
            header: "Authority",
            sortable: true,
            filter: "select",
          },
        ]}
        rows={fisheries.map((fishery) => {
          const authority = authorities.find(
            (item) => item.id === fishery.authority_id,
          );

          return {
            id: fishery.id,
            values: {
              name: fishery.name,
              code: fishery.code ?? "",
              authority: authority?.name ?? "",
            },
            display: {
              code: fishery.code ?? "—",
              authority: authority?.name ?? "—",
            },
            actions: (
              <Link
                href={`/admin/fisheries/${fishery.id}`}
                className="text-sm underline"
              >
                Open
              </Link>
            ),
          };
        })}
      />
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-ink">Create fishery</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Create an authority first if the list is empty.
        </p>
        <div className="mt-4">
          <AdminCreateForm
            action={createFisheryAction}
            submitLabel="Create fishery"
            fields={[
              {
                name: "authority_id",
                label: "Authority",
                type: "select",
                required: true,
                options: authorities.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                })),
              },
              { name: "name", label: "Name", required: true },
              { name: "code", label: "Code" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

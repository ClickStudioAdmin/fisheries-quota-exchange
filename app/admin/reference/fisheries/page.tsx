import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCreateForm } from "@/components/admin-create-form";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createFisheryAction } from "@/lib/fisheries/actions";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";

export const metadata = {
  title: "Fisheries",
};

export default async function FisheriesAdminPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const jurisdictions = await listJurisdictions();
  const fisheries = await listFisheries();

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Fisheries
      </h1>
      <DataTable
        caption="Fisheries"
        empty="No fisheries yet."
        searchPlaceholder="Filter fisheries…"
        defaultSort={{ key: "name", direction: "asc" }}
        columns={[
          { key: "name", header: "Name", sortable: true },
          { key: "code", header: "Code", sortable: true },
          {
            key: "jurisdiction",
            header: "Jurisdiction",
            sortable: true,
            filter: "select",
          },
          {
            key: "quantityType",
            header: "Quantity type",
            sortable: true,
            filter: "select",
          },
        ]}
        rows={fisheries.map((fishery) => {
          const jurisdiction = jurisdictions.find(
            (item) => item.id === fishery.jurisdiction_id,
          );
          const jurisdictionLabel = jurisdiction
            ? `${jurisdiction.code} — ${jurisdiction.name}`
            : "";

          return {
            id: fishery.id,
            values: {
              name: fishery.name,
              code: fishery.code ?? "",
              jurisdiction: jurisdictionLabel,
              quantityType: fishery.quantity_type === "KG" ? "Kg" : "Units",
            },
            display: {
              code: fishery.code ?? "—",
              jurisdiction: jurisdictionLabel || "—",
            },
          };
        })}
      >
        {fisheries.map((fishery) => (
          <DataTableRowExtras
            key={fishery.id}
            id={fishery.id}
            links={
              <Link
                href={`/admin/reference/fisheries/${fishery.id}`}
                className={tableLinkClassName}
              >
                Open
              </Link>
            }
          />
        ))}
      </DataTable>
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-ink">Create fishery</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Create a jurisdiction first if the list is empty.
        </p>
        <div className="mt-4">
          <AdminCreateForm
            action={createFisheryAction}
            submitLabel="Create fishery"
            fields={[
              {
                name: "jurisdiction_id",
                label: "Jurisdiction",
                type: "select",
                required: true,
                options: jurisdictions.map((item) => ({
                  value: String(item.id),
                  label: `${item.code} — ${item.name}`,
                })),
              },
              { name: "name", label: "Name", required: true },
              { name: "code", label: "Code" },
              {
                name: "quantity_type",
                label: "Quantity type",
                type: "select",
                required: true,
                options: [
                  { value: "KG", label: "Kg" },
                  { value: "UNITS", label: "Units" },
                ],
              },
              {
                name: "logo",
                label: "Logo (optional)",
                type: "file",
                accept: "image/jpeg,image/png,image/webp,image/gif",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

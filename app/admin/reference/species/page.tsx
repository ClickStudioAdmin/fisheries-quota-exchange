import { AdminCreateForm } from "@/components/admin-create-form";
import { DataTable } from "@/components/data-table";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createSpeciesAction } from "@/lib/fisheries/actions";
import { listSpecies } from "@/lib/fisheries/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Species",
};

export default async function SpeciesPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const species = await listSpecies();

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Species
      </h1>
      <DataTable
        caption="Species"
        empty="No species yet."
        searchPlaceholder="Filter species…"
        defaultSort={{ key: "common", direction: "asc" }}
        columns={[
          { key: "common", header: "Common name", sortable: true },
          { key: "scientific", header: "Scientific name", sortable: true },
        ]}
        rows={species.map((item) => ({
          id: item.id,
          values: {
            common: item.common_name,
            scientific: item.scientific_name ?? "",
          },
          display: {
            scientific: item.scientific_name ?? "—",
          },
        }))}
      />
      <div className="max-w-md">
        <AdminCreateForm
          action={createSpeciesAction}
          submitLabel="Add species"
          fields={[
            { name: "common_name", label: "Common name", required: true },
            { name: "scientific_name", label: "Scientific name" },
          ]}
        />
      </div>
    </div>
  );
}

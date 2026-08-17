import { AdminCreateForm } from "@/components/admin-create-form";
import { DataTable } from "@/components/data-table";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createJurisdictionAction } from "@/lib/fisheries/actions";
import { listJurisdictions } from "@/lib/fisheries/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Jurisdictions",
};

export default async function JurisdictionsPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const jurisdictions = await listJurisdictions();

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Jurisdictions
      </h1>
      <DataTable
        caption="Jurisdictions"
        empty="No jurisdictions yet."
        searchPlaceholder="Filter jurisdictions…"
        defaultSort={{ key: "code", direction: "asc" }}
        columns={[
          { key: "code", header: "Code", sortable: true },
          { key: "name", header: "Name", sortable: true },
        ]}
        rows={jurisdictions.map((item) => ({
          id: item.id,
          values: {
            code: item.code,
            name: item.name,
          },
        }))}
      />
      <div className="max-w-md">
        <AdminCreateForm
          action={createJurisdictionAction}
          submitLabel="Add jurisdiction"
          fields={[
            { name: "code", label: "Code", required: true },
            { name: "name", label: "Name", required: true },
          ]}
        />
      </div>
    </div>
  );
}

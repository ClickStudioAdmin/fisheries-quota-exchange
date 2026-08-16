import { AdminCreateForm } from "@/components/admin-create-form";
import { DataTable } from "@/components/data-table";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  createAuthorityAction,
  createJurisdictionAction,
  createSpeciesAction,
} from "@/lib/fisheries/actions";
import {
  listAuthorities,
  listJurisdictions,
  listSpecies,
} from "@/lib/fisheries/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Reference data",
};

export default async function ReferencePage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const jurisdictions = await listJurisdictions();
  const authorities = await listAuthorities();
  const species = await listSpecies();

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Reference data
      </h1>
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-ink">Jurisdictions</h2>
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
      </section>
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-ink">Authorities</h2>
        <DataTable
          caption="Authorities"
          empty="No authorities yet."
          searchPlaceholder="Filter authorities…"
          defaultSort={{ key: "name", direction: "asc" }}
          columns={[
            { key: "name", header: "Name", sortable: true },
            {
              key: "jurisdiction",
              header: "Jurisdiction",
              sortable: true,
              filter: "select",
            },
          ]}
          rows={authorities.map((item) => {
            const jurisdiction = jurisdictions.find(
              (row) => row.id === item.jurisdiction_id,
            );
            return {
              id: item.id,
              values: {
                name: item.name,
                jurisdiction: jurisdiction
                  ? `${jurisdiction.code} — ${jurisdiction.name}`
                  : "",
              },
              display: {
                jurisdiction: jurisdiction
                  ? `${jurisdiction.code} — ${jurisdiction.name}`
                  : "—",
              },
            };
          })}
        />
        <div className="max-w-md">
          <AdminCreateForm
            action={createAuthorityAction}
            submitLabel="Add authority"
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
            ]}
          />
        </div>
      </section>
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-ink">Species</h2>
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
      </section>
    </div>
  );
}

import { AdminCreateForm } from "@/components/admin-create-form";
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
      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">Jurisdictions</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {jurisdictions.map((item) => (
              <li key={item.id}>
                {item.code} — {item.name}
              </li>
            ))}
          </ul>
        </div>
        <AdminCreateForm
          action={createJurisdictionAction}
          submitLabel="Add jurisdiction"
          fields={[
            { name: "code", label: "Code", required: true },
            { name: "name", label: "Name", required: true },
          ]}
        />
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">Authorities</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {authorities.map((item) => {
              const jurisdiction = jurisdictions.find(
                (row) => row.id === item.jurisdiction_id,
              );
              return (
                <li key={item.id}>
                  {item.name}
                  {jurisdiction ? ` (${jurisdiction.code})` : ""}
                </li>
              );
            })}
          </ul>
        </div>
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
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">Species</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {species.map((item) => (
              <li key={item.id}>
                {item.common_name}
                {item.scientific_name ? ` (${item.scientific_name})` : ""}
              </li>
            ))}
          </ul>
        </div>
        <AdminCreateForm
          action={createSpeciesAction}
          submitLabel="Add species"
          fields={[
            { name: "common_name", label: "Common name", required: true },
            { name: "scientific_name", label: "Scientific name" },
          ]}
        />
      </section>
    </div>
  );
}

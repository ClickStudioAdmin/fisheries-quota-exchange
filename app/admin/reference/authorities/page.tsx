import { AdminCreateForm } from "@/components/admin-create-form";
import { DataTable } from "@/components/data-table";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createAuthorityAction } from "@/lib/fisheries/actions";
import { listAuthorities, listJurisdictions } from "@/lib/fisheries/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Authorities",
};

export default async function AuthoritiesPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const jurisdictions = await listJurisdictions();
  const authorities = await listAuthorities();

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Authorities
      </h1>
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
    </div>
  );
}

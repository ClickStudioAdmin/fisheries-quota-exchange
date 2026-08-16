import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminCreateForm } from "@/components/admin-create-form";
import { DataTable } from "@/components/data-table";
import { formatTableDate } from "@/lib/format";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  createFisheryRuleAction,
  createQuotaTypeAction,
  createSeasonAction,
  createStockAction,
} from "@/lib/fisheries/actions";
import {
  getFishery,
  listFisheryRules,
  listQuotaTypes,
  listSeasons,
  listSpecies,
  listStocks,
} from "@/lib/fisheries/queries";
import { MEASUREMENT_KINDS } from "@/lib/fisheries/types";

export const metadata = {
  title: "Fishery",
};

export default async function FisheryAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const { id } = await params;
  const fisheryId = Number(id);

  if (!Number.isInteger(fisheryId)) {
    notFound();
  }

  const fishery = await getFishery(fisheryId);

  if (!fishery) {
    notFound();
  }

  const [species, stocks, seasons, quotaTypes, rules] = await Promise.all([
    listSpecies(),
    listStocks(fisheryId),
    listSeasons(fisheryId),
    listQuotaTypes(fisheryId),
    listFisheryRules(fisheryId),
  ]);

  return (
    <div className="space-y-12">
      <div>
        <p className="text-sm text-ink-muted">
          <Link href="/admin/fisheries" className="underline">
            Fisheries
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {fishery.name}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Rules are configurable. Quota types choose WEIGHT, UNITS, EFFORT or
          OTHER — do not assume kilograms.
        </p>
      </div>
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-ink">Stocks</h2>
        <DataTable
          caption="Stocks"
          empty="No stocks yet."
          searchPlaceholder="Filter stocks…"
          defaultSort={{ key: "name", direction: "asc" }}
          columns={[
            { key: "name", header: "Name", sortable: true },
            {
              key: "species",
              header: "Species",
              sortable: true,
              filter: "select",
            },
          ]}
          rows={stocks.map((item) => {
            const row = species.find((entry) => entry.id === item.species_id);
            return {
              id: item.id,
              values: {
                name: item.name,
                species: row?.common_name ?? "",
              },
              display: {
                species: row?.common_name ?? "—",
              },
            };
          })}
        />
        <div className="max-w-md">
          <AdminCreateForm
            action={createStockAction}
            hidden={{ fishery_id: fisheryId }}
            submitLabel="Add stock"
            fields={[
              {
                name: "species_id",
                label: "Species",
                type: "select",
                required: true,
                options: species.map((item) => ({
                  value: String(item.id),
                  label: item.common_name,
                })),
              },
              { name: "name", label: "Stock name", required: true },
            ]}
          />
        </div>
      </section>
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-ink">Seasons</h2>
        <DataTable
          caption="Seasons"
          empty="No seasons yet."
          searchPlaceholder="Filter seasons…"
          defaultSort={{ key: "starts", direction: "desc" }}
          columns={[
            { key: "name", header: "Name", sortable: true },
            { key: "starts", header: "Starts", sortable: true },
            { key: "ends", header: "Ends", sortable: true },
          ]}
          rows={seasons.map((item) => ({
            id: item.id,
            values: {
              name: item.name,
              starts: item.starts_on,
              ends: item.ends_on,
            },
            display: {
              starts: formatTableDate(item.starts_on),
              ends: formatTableDate(item.ends_on),
            },
          }))}
        />
        <div className="max-w-md">
          <AdminCreateForm
            action={createSeasonAction}
            hidden={{ fishery_id: fisheryId }}
            submitLabel="Add season"
            fields={[
              { name: "name", label: "Name", required: true },
              { name: "starts_on", label: "Starts on", type: "date", required: true },
              { name: "ends_on", label: "Ends on", type: "date", required: true },
            ]}
          />
        </div>
      </section>
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-ink">Quota types</h2>
        <DataTable
          caption="Quota types"
          empty="No quota types yet."
          searchPlaceholder="Filter quota types…"
          defaultSort={{ key: "name", direction: "asc" }}
          columns={[
            { key: "name", header: "Name", sortable: true },
            {
              key: "kind",
              header: "Measurement",
              sortable: true,
              filter: "select",
            },
            { key: "unit", header: "Unit", sortable: true },
          ]}
          rows={quotaTypes.map((item) => ({
            id: item.id,
            values: {
              name: item.name,
              kind: item.measurement_kind,
              unit: item.unit_label,
            },
          }))}
        />
        <div className="max-w-md">
          <AdminCreateForm
            action={createQuotaTypeAction}
            hidden={{ fishery_id: fisheryId }}
            submitLabel="Add quota type"
            fields={[
              { name: "name", label: "Name", required: true },
              {
                name: "measurement_kind",
                label: "Measurement kind",
                type: "select",
                required: true,
                options: MEASUREMENT_KINDS.map((kind) => ({
                  value: kind,
                  label: kind,
                })),
              },
              { name: "unit_label", label: "Unit label", required: true },
            ]}
          />
        </div>
      </section>
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-ink">Fishery rules</h2>
        <DataTable
          caption="Fishery rules"
          empty="No rules yet."
          searchPlaceholder="Filter rules…"
          defaultSort={{ key: "code", direction: "asc" }}
          columns={[
            { key: "code", header: "Code", sortable: true },
            { key: "value", header: "Value", sortable: true },
          ]}
          rows={rules.map((item) => ({
            id: item.id,
            values: {
              code: item.code,
              value:
                typeof item.value === "string"
                  ? item.value
                  : JSON.stringify(item.value),
            },
          }))}
        />
        <div className="max-w-md">
          <AdminCreateForm
            action={createFisheryRuleAction}
            hidden={{ fishery_id: fisheryId }}
            submitLabel="Add rule"
            fields={[
              { name: "code", label: "Code", required: true },
              {
                name: "value",
                label: "Value (JSON or text)",
                type: "textarea",
                defaultValue: "true",
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminCreateForm } from "@/components/admin-create-form";
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
      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">Stocks</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {stocks.map((item) => {
              const row = species.find((entry) => entry.id === item.species_id);
              return (
                <li key={item.id}>
                  {item.name}
                  {row ? ` · ${row.common_name}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
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
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">Seasons</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {seasons.map((item) => (
              <li key={item.id}>
                {item.name}: {item.starts_on} – {item.ends_on}
              </li>
            ))}
          </ul>
        </div>
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
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">Quota types</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {quotaTypes.map((item) => (
              <li key={item.id}>
                {item.name} · {item.measurement_kind} · {item.unit_label}
              </li>
            ))}
          </ul>
        </div>
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
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">Fishery rules</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {rules.map((item) => (
              <li key={item.id}>
                {item.code}: {JSON.stringify(item.value)}
              </li>
            ))}
          </ul>
        </div>
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
      </section>
    </div>
  );
}

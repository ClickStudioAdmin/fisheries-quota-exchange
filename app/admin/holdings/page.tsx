import { redirect } from "next/navigation";
import { AdminCreateForm } from "@/components/admin-create-form";
import { isPlatformAdmin } from "@/lib/admin/access";
import { createHoldingAction } from "@/lib/fisheries/actions";
import {
  listAllHoldings,
  listAllQuotaTypes,
  listAllSeasons,
  listAllStocks,
  listFisheries,
  listLedger,
} from "@/lib/fisheries/queries";
import { listOrganisationsForAdmin } from "@/lib/organisations/admin-queries";

export const metadata = {
  title: "Holdings",
};

export default async function HoldingsAdminPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const [organisations, fisheries, stocks, seasons, quotaTypes, holdings] =
    await Promise.all([
      listOrganisationsForAdmin(),
      listFisheries(),
      listAllStocks(),
      listAllSeasons(),
      listAllQuotaTypes(),
      listAllHoldings(),
    ]);

  const ledgers = await Promise.all(
    holdings.slice(0, 10).map(async (holding) => ({
      holding,
      entries: await listLedger(holding.id),
    })),
  );

  function fisheryName(fisheryId: number) {
    return fisheries.find((item) => item.id === fisheryId)?.name ?? "Fishery";
  }

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Quota holdings
      </h1>
      <p className="text-sm text-ink-muted">
        Creating a holding records INITIAL_ALLOCATION on the quota ledger. Stock,
        season and quota type must belong to the same fishery.
      </p>
      <div className="max-w-md">
        <AdminCreateForm
          action={createHoldingAction}
          submitLabel="Create holding"
          fields={[
            {
              name: "organisation_id",
              label: "Organisation",
              type: "select",
              required: true,
              options: organisations.map((item) => ({
                value: String(item.id),
                label: item.legal_name,
              })),
            },
            {
              name: "stock_id",
              label: "Stock",
              type: "select",
              required: true,
              options: stocks.map((item) => ({
                value: String(item.id),
                label: `${fisheryName(item.fishery_id)} · ${item.name}`,
              })),
            },
            {
              name: "season_id",
              label: "Season",
              type: "select",
              required: true,
              options: seasons.map((item) => ({
                value: String(item.id),
                label: `${fisheryName(item.fishery_id)} · ${item.name}`,
              })),
            },
            {
              name: "quota_type_id",
              label: "Quota type",
              type: "select",
              required: true,
              options: quotaTypes.map((item) => ({
                value: String(item.id),
                label: `${fisheryName(item.fishery_id)} · ${item.name} (${item.unit_label})`,
              })),
            },
            {
              name: "quantity",
              label: "Quantity",
              type: "number",
              required: true,
            },
            { name: "note", label: "Note" },
          ]}
        />
      </div>
      <section className="space-y-6">
        {ledgers.map(({ holding, entries }) => (
          <div key={holding.id} className="border border-line p-4">
            <p className="font-medium text-ink">
              Holding {holding.id} · quantity {holding.quantity}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              {entries.map((entry) => (
                <li key={entry.id}>
                  {entry.created_at}: {entry.event_type} {entry.quantity_delta}{" "}
                  → {entry.quantity_after}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

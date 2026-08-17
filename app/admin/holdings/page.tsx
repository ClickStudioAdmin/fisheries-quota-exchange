import { redirect } from "next/navigation";
import { AdminCreateForm } from "@/components/admin-create-form";
import { DataTable, DataTableRowExtras } from "@/components/data-table";
import { LedgerTable } from "@/components/ledger-table";
import { tableButtonClassName } from "@/components/auth-card";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  createHoldingAction,
  verifyHoldingAction,
} from "@/lib/fisheries/actions";
import {
  listAllHoldings,
  listAllQuotaTypes,
  listAllSeasons,
  listAllStocks,
  listFisheries,
  listLedger,
} from "@/lib/fisheries/queries";
import {
  holdingIsVerified,
  holdingVerificationLabel,
} from "@/lib/fisheries/types";
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
    holdings.map(async (holding) => ({
      holding,
      entries: await listLedger(holding.id),
    })),
  );

  function fisheryName(fisheryId: number) {
    return fisheries.find((item) => item.id === fisheryId)?.name ?? "Fishery";
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Quota holdings
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Users create and update their own holdings. Unverified holdings must
          be approved here before they can be listed or auctioned. Quantity
          changes write an ADJUSTMENT ledger row.
        </p>
      </div>
      <DataTable
        caption="Quota holdings"
        empty="No holdings yet."
        searchPlaceholder="Filter holdings…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "ID", sortable: true },
          {
            key: "organisation",
            header: "Organisation",
            sortable: true,
            filter: "select",
          },
          { key: "stock", header: "Stock", sortable: true, filter: "select" },
          { key: "season", header: "Season", sortable: true, filter: "select" },
          { key: "quotaType", header: "Quota type", sortable: true },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "Verified", label: "Verified" },
              { value: "Pending verification", label: "Pending verification" },
            ],
          },
        ]}
        rows={ledgers.map(({ holding }) => {
          const organisation = organisations.find(
            (item) => item.id === holding.organisation_id,
          );
          const stock = stocks.find((item) => item.id === holding.stock_id);
          const season = seasons.find((item) => item.id === holding.season_id);
          const quotaType = quotaTypes.find(
            (item) => item.id === holding.quota_type_id,
          );

          return {
            id: holding.id,
            values: {
              id: holding.id,
              organisation: organisation?.legal_name ?? "Organisation",
              stock: stock?.name ?? "Stock",
              season: season?.name ?? "Season",
              quotaType: quotaType
                ? `${quotaType.name} (${quotaType.measurement_kind})`
                : "Quota type",
              quantity: holding.quantity,
              status: holdingVerificationLabel(holding.verification_status),
            },
            display: {
              quantity: `${holding.quantity} ${quotaType?.unit_label ?? ""}`.trim(),
            },
          };
        })}
      >
        {ledgers.map(({ holding, entries }) => (
          <DataTableRowExtras
            key={holding.id}
            id={holding.id}
            expandedLabel="Ledger"
            expanded={
              <LedgerTable
                caption={`Ledger for holding ${holding.id}`}
                entries={entries}
              />
            }
            actions={
              holdingIsVerified(holding) ? null : (
                <form action={verifyHoldingAction}>
                  <input
                    type="hidden"
                    name="holding_id"
                    value={String(holding.id)}
                  />
                  <button type="submit" className={tableButtonClassName}>
                    Verify holding
                  </button>
                </form>
              )
            }
          />
        ))}
      </DataTable>
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-ink">Create holding</h2>
        <div className="mt-4">
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
      </div>
    </div>
  );
}

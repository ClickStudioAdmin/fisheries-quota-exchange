import { redirect } from "next/navigation";
import { DataTable, DataTableRowExtras } from "@/components/data-table";
import { LedgerTable } from "@/components/ledger-table";
import { HoldingForm } from "@/components/holding-form";
import { tableButtonClassName } from "@/components/auth-card";
import { isPlatformAdmin } from "@/lib/admin/access";
import { verifyHoldingAction } from "@/lib/fisheries/actions";
import { listAllHoldings, listFisheries, listLedger } from "@/lib/fisheries/queries";
import {
  holdingIsVerified,
  holdingVerificationLabel,
  quantityTypeLabel,
} from "@/lib/fisheries/types";
import { listOrganisationsForAdmin } from "@/lib/organisations/admin-queries";

export const metadata = {
  title: "Holdings",
};

export default async function HoldingsAdminPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const [organisations, fisheries, holdings] = await Promise.all([
    listOrganisationsForAdmin(),
    listFisheries(),
    listAllHoldings(),
  ]);

  const ledgers = await Promise.all(
    holdings.map(async (holding) => ({
      holding,
      entries: await listLedger(holding.id),
    })),
  );

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
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
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
          const fishery = fisheries.find((item) => item.id === holding.fishery_id);
          const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "";

          return {
            id: holding.id,
            values: {
              id: holding.id,
              organisation: organisation?.legal_name ?? "Organisation",
              fishery: fishery?.name ?? "Fishery",
              quantity: holding.quantity,
              status: holdingVerificationLabel(holding.verification_status),
            },
            display: {
              quantity: `${holding.quantity} ${unit}`.trim(),
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
          <HoldingForm organisations={organisations} fisheries={fisheries} />
        </div>
      </div>
    </div>
  );
}

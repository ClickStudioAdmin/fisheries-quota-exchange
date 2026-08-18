import { redirect } from "next/navigation";
import Link from "next/link";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { HoldingForm } from "@/components/holding-form";
import { VerifyHoldingForm } from "@/components/verify-holding-form";
import { BulkReviewHoldingsModal } from "@/components/bulk-review-holdings-modal";
import { isPlatformAdmin } from "@/lib/admin/access";
import { startHoldingVerifyAction } from "@/lib/fisheries/actions";
import {
  listAllHoldings,
  listFisheries,
  listJurisdictions,
} from "@/lib/fisheries/queries";
import {
  fisherySelectLabel,
  holdingIsVerified,
  holdingVerificationLabel,
  holdingVerifyPath,
  parseHoldingIds,
  quantityTypeLabel,
  type QuotaHolding,
} from "@/lib/fisheries/types";
import { listOrganisationsForAdmin } from "@/lib/organisations/admin-queries";
import { adminHoldingPath } from "@/lib/organisations/paths";

export const metadata = {
  title: "Holdings",
};

export default async function HoldingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const query = await searchParams;
  const [organisations, fisheries, jurisdictions, holdings] = await Promise.all([
    listOrganisationsForAdmin(),
    listFisheries(),
    listJurisdictions(),
    listAllHoldings(),
  ]);
  const queued = parseHoldingIds(query.queue);
  const byId = new Map(holdings.map((holding) => [holding.id, holding]));
  const queueHoldings = queued
    .map((id) => byId.get(id))
    .filter(
      (holding): holding is QuotaHolding =>
        holding != null && holding.verification_status === "PENDING_VERIFICATION",
    );
  const remainingPath = holdingVerifyPath(queueHoldings.map((holding) => holding.id));
  const requestedPath = holdingVerifyPath(queued);

  if (queued.length > 0 && remainingPath !== requestedPath) {
    redirect(remainingPath);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Quota holdings
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Users create and update their own holdings. Unverified holdings must
          be approved here before they can be listed or auctioned. Select
          pending holdings to verify them in a queue. Quantity changes write an
          ADJUSTMENT ledger row.
        </p>
      </div>
      <DataTable
        caption="Quota holdings"
        empty="No holdings yet."
        searchPlaceholder="Filter holdings…"
        defaultSort={{ key: "id", direction: "desc" }}
        selectable
        bulkActions={[
          {
            label: "Verify",
            action: startHoldingVerifyAction,
            requireValue: {
              key: "status",
              value: "PENDING_VERIFICATION",
            },
          },
        ]}
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
              { value: "VERIFIED", label: "Verified" },
              { value: "PENDING_VERIFICATION", label: "Pending verification" },
            ],
          },
        ]}
        rows={holdings.map((holding) => {
          const organisation = organisations.find(
            (item) => item.id === holding.organisation_id,
          );
          const fishery = fisheries.find((item) => item.id === holding.fishery_id);
          const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "";

          return {
            id: holding.id,
            needsAction: !holdingIsVerified(holding),
            values: {
              id: holding.id,
              organisation: organisation?.legal_name ?? "Organisation",
              fishery: fishery
                ? fisherySelectLabel(fishery, jurisdictions)
                : "Fishery",
              quantity: holding.quantity,
              status: holding.verification_status,
            },
            display: {
              quantity: `${holding.quantity} ${unit}`.trim(),
              status: holdingVerificationLabel(holding.verification_status),
            },
          };
        })}
      >
        {holdings.map((holding) => (
          <DataTableRowExtras
            key={holding.id}
            id={holding.id}
            links={
              <Link
                href={adminHoldingPath(holding.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={tableLinkClassName}
              >
                Details
              </Link>
            }
            actions={
              holdingIsVerified(holding) ? null : (
                <VerifyHoldingForm holdingId={holding.id} />
              )
            }
          />
        ))}
      </DataTable>
      {queueHoldings.length > 0 ? (
        <BulkReviewHoldingsModal count={queueHoldings.length}>
          {queueHoldings.map((holding, index) => {
            const organisation = organisations.find(
              (item) => item.id === holding.organisation_id,
            );
            const fishery = fisheries.find(
              (item) => item.id === holding.fishery_id,
            );
            const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "";

            return (
              <section
                key={holding.id}
                className="space-y-4 py-6 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                    {index + 1} of {queueHoldings.length}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">
                    Holding {holding.id} ·{" "}
                    {organisation?.legal_name ?? "Organisation"}
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {fishery
                      ? fisherySelectLabel(fishery, jurisdictions)
                      : "Fishery"}{" "}
                    · {holding.quantity} {unit}
                  </p>
                </div>
                <VerifyHoldingForm
                  holdingId={holding.id}
                  reviewQueue={queueHoldings.map((item) => item.id)}
                  withRequestChanges
                />
              </section>
            );
          })}
        </BulkReviewHoldingsModal>
      ) : null}
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-ink">Create holding</h2>
        <div className="mt-4">
          <HoldingForm
            organisations={organisations}
            fisheries={fisheries}
            jurisdictions={jurisdictions}
          />
        </div>
      </div>
    </div>
  );
}

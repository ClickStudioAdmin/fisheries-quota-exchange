import Link from "next/link";
import { tableButtonClassName } from "@/components/auth-card";
import {
  DataTable,
  DataTableRowExtras,
  TableActionRow,
  tableLinkClassName,
} from "@/components/data-table";
import { OrderTableDownloads, OrderTableLinks } from "@/components/order-table-links";
import { EditHoldingButton } from "@/components/holding-actions";
import { EditListingPriceButton } from "@/components/edit-listing-price-form";
import { LedgerTable } from "@/components/ledger-table";
import { LabeledFields } from "@/components/surface";
import { TableModal } from "@/components/table-modal";
import { HoldingVerificationPanel } from "@/components/holding-verification-panel";
import {
  getFishery,
  listHoldingCommitments,
  listJurisdictions,
  listLedger,
} from "@/lib/fisheries/queries";
import {
  fisherySelectLabel,
  holdingIsVerified,
  holdingVerificationLabel,
  jurisdictionLabel,
  quantityTypeLabel,
  type QuotaHolding,
} from "@/lib/fisheries/types";
import { formatTableDate } from "@/lib/format";
import { listListingsByHolding } from "@/lib/listings/queries";
import {
  canEditListingPrice,
  formatAud,
  listingEditMaxQuantity,
  listingHref,
  listingOfferingLabel,
  listingStatusLabel,
  listingTypeLabel,
} from "@/lib/listings/types";
import {
  latestSalePriceMap,
  listLatestSalePrices,
} from "@/lib/market/queries";
import { marketValue } from "@/lib/market/types";
import { listOrdersByHolding } from "@/lib/orders/queries";
import { orderStatusLabelFor } from "@/lib/transfers/display";
import { listTransferApplicationsByOrderIds } from "@/lib/transfers/queries";
import { getOrganisation, getOrganisationLegalName } from "@/lib/organisations/queries";
import { canEditOrganisation } from "@/lib/organisations/permissions";
import { accountPaymentsPath } from "@/lib/organisations/paths";
import { organisationCanSellError } from "@/lib/payments/sell-access";
import { PaymentsSetupNotice } from "@/components/payments-setup-notice";
import { BusinessDetailsRequiredNotice } from "@/components/business-details-required-notice";
import {
  ownMissingTradeReadyFields,
  ownMissingTradeReadyLabels,
} from "@/lib/organisations/eligibility";
import { tradeRequiresQldProfile } from "@/lib/organisations/completeness";

export async function HoldingRecord({
  holding,
  backHref,
  backLabel,
  variant,
}: {
  holding: QuotaHolding;
  backHref: string;
  backLabel: string;
  variant: "admin" | "account";
}) {
  const [
    fishery,
    jurisdictions,
    organisationName,
    account,
    ledger,
    commitments,
    listings,
    orders,
    prices,
    sellError,
  ] = await Promise.all([
    getFishery(holding.fishery_id),
    listJurisdictions(),
    getOrganisationLegalName(holding.organisation_id),
    variant === "account" ? getOrganisation(holding.organisation_id) : null,
    listLedger(holding.id),
    listHoldingCommitments([holding.id]),
    listListingsByHolding(holding.id),
    listOrdersByHolding(holding.id),
    listLatestSalePrices(),
    variant === "account"
      ? organisationCanSellError(holding.organisation_id)
      : Promise.resolve(null),
  ]);
  const unit = fishery ? quantityTypeLabel(fishery.quantity_type) : "units";
  const transferApplications = await listTransferApplicationsByOrderIds(
    orders.map((order) => order.id),
  );
  const listed = commitments.get(holding.id) ?? 0;
  const available = Number(holding.quantity) - listed;
  const verified = holdingIsVerified(holding);
  const canManage =
    variant === "account" && account
      ? canEditOrganisation(account.role)
      : false;
  const sale = latestSalePriceMap(prices).get(holding.fishery_id);
  const value = sale
    ? marketValue(holding.quantity, sale.unit_price_aud)
    : null;
  const jurisdiction = jurisdictions.find(
    (item) => item.id === fishery?.jurisdiction_id,
  );
  const detailsMissing =
    variant === "account"
      ? await ownMissingTradeReadyFields(holding.organisation_id, {
          requireQldProfile: tradeRequiresQldProfile(jurisdiction?.code),
        })
      : [];
  const detailsIncomplete = detailsMissing.length > 0;
  const listingBlocked = Boolean(sellError) || detailsIncomplete;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-ink-muted">
          <Link href={backHref} className="underline">
            {backLabel}
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {fishery?.name ?? `Holding ${holding.id}`}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Holding {holding.id}. Quantity changes are recorded on the ledger
              below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {variant === "admin" && !verified ? (
              <TableModal
                persistKey={`holding-${holding.id}-review`}
                title="Review holding"
                label="Review"
                wide
              >
                <HoldingVerificationPanel holdingId={holding.id} />
              </TableModal>
            ) : null}
            {canManage ? (
              <EditHoldingButton
                title={`Edit ${fishery?.name ?? "holding"}`}
                holdingId={holding.id}
                quantity={holding.quantity}
                unitLabel={unit}
                minQuantity={String(listed)}
              />
            ) : null}
          </div>
        </div>
        <div className="mt-6">
          <LabeledFields
            columns={5}
            items={[
              {
                label: "Business",
                value: organisationName ?? "Business",
              },
              {
                label: "Fishery",
                value: (
                  <Link
                    href={`/fisheries/${holding.fishery_id}`}
                    className="underline"
                  >
                    {fishery?.name ?? "Fishery"}
                  </Link>
                ),
              },
              {
                label: "Jurisdiction",
                value: jurisdictionLabel(jurisdiction),
              },
              {
                label: "Code",
                value: fishery?.code ?? "—",
              },
              {
                label: "Quantity type",
                value: unit,
              },
              {
                label: "Quantity",
                value: `${holding.quantity} ${unit}`,
              },
              {
                label: "Listed",
                value: `${listed} ${unit}`,
              },
              {
                label: "Available",
                value: `${available} ${unit}`,
              },
              {
                label: "Status",
                value: holdingVerificationLabel(holding.verification_status),
              },
              {
                label: "Market value",
                value: value != null ? formatAud(value) : "—",
              },
            ]}
          />
        </div>
        {canManage && verified && available > 0 ? (
          <div className="mt-4 space-y-3">
            {detailsIncomplete ? (
              <BusinessDetailsRequiredNotice
                action="list"
                missingLabels={ownMissingTradeReadyLabels(detailsMissing)}
              />
            ) : sellError ? (
              <PaymentsSetupNotice
                href={accountPaymentsPath(holding.organisation_id)}
              />
            ) : null}
            <TableActionRow>
              {listingBlocked ? (
                <>
                  <button type="button" disabled className={tableButtonClassName}>
                    Create listing
                  </button>
                  <button type="button" disabled className={tableButtonClassName}>
                    Create auction
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/organisations/${holding.organisation_id}/listings/new?holding_id=${holding.id}`}
                    className={tableLinkClassName}
                  >
                    Create listing
                  </Link>
                  <Link
                    href={`/organisations/${holding.organisation_id}/auctions/new?holding_id=${holding.id}`}
                    className={tableLinkClassName}
                  >
                    Create auction
                  </Link>
                </>
              )}
            </TableActionRow>
          </div>
        ) : null}
        {canManage && verified && available <= 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            All of this holding is listed. Cancel a listing to list more, or
            increase the holding quantity.
          </p>
        ) : null}
        {canManage && !verified ? (
          <p className="mt-4 text-sm text-ink-muted">
            Waiting for admin verification before listing.
          </p>
        ) : null}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Ledger</h2>
        <LedgerTable
          caption={`Ledger for holding ${holding.id}`}
          entries={ledger}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Current Listings</h2>
        <DataTable
        caption="Current listings"
        empty="No listings from this holding."
        searchPlaceholder="Filter listings…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "ID", sortable: true, details: true, nowrap: true },
          {
            key: "type",
            header: "Listing type",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "FIXED_PRICE", label: "Fixed price" },
              { value: "AUCTION", label: "Auction" },
            ],
          },
          {
            key: "offering",
            header: "Offering",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "SALE", label: "Sale" },
              { value: "LEASE", label: "Lease" },
            ],
          },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          { key: "price", header: "Price", sortable: true, align: "right" },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "PENDING_APPROVAL", label: "Pending approval" },
              { value: "PUBLISHED", label: "Live" },
              { value: "RESERVED", label: "Reserved" },
              { value: "SOLD", label: "Sold" },
              { value: "UNSOLD", label: "Unsold" },
              { value: "CANCELLED", label: "Cancelled" },
              { value: "REJECTED", label: "Rejected" },
            ],
          },
        ]}
        rows={listings.map((listing) => ({
          id: listing.id,
          details: [
            { label: "Created", value: formatTableDate(listing.created_at) },
          ],
          values: {
            id: listing.id,
            type: listing.listing_type,
            offering: listing.offering,
            quantity: listing.quantity,
            price: listing.unit_price_aud,
            status: listing.status,
            created: listing.created_at,
          },
          display: {
            type: listingTypeLabel(listing.listing_type),
            offering: listingOfferingLabel(listing.offering),
            quantity: `${listing.quantity} ${listing.unit_label}`,
            price: formatAud(listing.unit_price_aud),
            status: listingStatusLabel(listing.status),
          },
        }))}
      >
        {listings.map((listing) => (
          <DataTableRowExtras
            key={listing.id}
            id={listing.id}
            links={
              <Link
                href={listingHref(listing)}
                target="_blank"
                rel="noopener noreferrer"
                className={tableLinkClassName}
              >
                View
              </Link>
            }
            actions={
              canManage && canEditListingPrice(listing) ? (
                <EditListingPriceButton
                  title="Edit listing"
                  listingId={listing.id}
                  unitLabel={listing.unit_label}
                  currentQuantity={listing.quantity}
                  maxQuantity={listingEditMaxQuantity(
                    listing.quantity,
                    holding.quantity,
                    listed,
                  )}
                  currentPrice={listing.unit_price_aud}
                />
              ) : null
            }
          />
        ))}
      </DataTable>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Orders</h2>
        <DataTable
        caption="Orders"
        empty="No orders against this holding."
        searchPlaceholder="Filter orders…"
        defaultSort={{ key: "id", direction: "desc" }}
        columns={[
          { key: "id", header: "ID", sortable: true, details: true, nowrap: true },
          {
            key: "parties",
            header: "Buyer / seller",
            stacked: [
              { key: "buyer", label: "Buyer", filter: "select" },
              { key: "seller", label: "Seller", filter: "select" },
            ],
          },
          {
            key: "offering",
            header: "Offering",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "SALE", label: "Sale" },
              { value: "LEASE", label: "Lease" },
            ],
          },
          {
            key: "fishery",
            header: "Fishery",
            sortable: true,
            filter: "select",
          },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          {
            key: "amount",
            header: "Amount",
            sortable: true,
            align: "right",
            stacked: [
              { key: "amount", label: "Amount" },
              { key: "fee", label: "Fee" },
            ],
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
              { value: "AWAITING_COMPLIANCE", label: "Awaiting compliance" },
              { value: "AWAITING_TRANSFER", label: "Awaiting transfer" },
              { value: "AWAITING_SETTLEMENT", label: "Awaiting settlement" },
              { value: "COMPLETED", label: "Completed" },
              { value: "REJECTED", label: "Rejected" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
          },
        ]}
        rows={orders.map((order) => ({
          id: order.id,
          details: [
            { label: "Created", value: formatTableDate(order.created_at) },
          ],
          values: {
            id: order.id,
            parties: `${order.buyer_name} ${order.seller_name}`,
            buyer: order.buyer_name,
            seller: order.seller_name,
            fishery: fishery
              ? fisherySelectLabel(fishery, jurisdictions)
              : order.fishery_name,
            offering: order.offering,
            quantity: order.quantity,
            amount: order.amount_aud,
            fee: order.fee_amount_aud,
            status: order.status,
            created: order.created_at,
          },
          display: {
            offering: listingOfferingLabel(order.offering),
            quantity: `${order.quantity} ${order.unit_label}`,
            amount: formatAud(order.amount_aud),
            fee:
              Number(order.fee_percent) > 0
                ? `${formatAud(order.fee_amount_aud)} (${order.fee_percent}%)`
                : formatAud(order.fee_amount_aud),
            status: orderStatusLabelFor(
              order,
              transferApplications,
              fishery ? [fishery] : [],
              jurisdictions,
            ),
          },
        }))}
      >
        {orders.map((order) => (
          <DataTableRowExtras
            key={order.id}
            id={order.id}
            links={<OrderTableLinks orderId={order.id} />}
            downloads={
              <OrderTableDownloads
                orderId={order.id}
                settled={order.status === "COMPLETED"}
              />
            }
          />
        ))}
      </DataTable>
      </section>
    </div>
  );
}

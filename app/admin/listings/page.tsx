import Link from "next/link";
import { redirect } from "next/navigation";
import { startListingReviewAction } from "@/lib/listings/actions";
import { listAllListings } from "@/lib/listings/queries";
import {
  formatAud,
  listingOfferingLabel,
  listingReviewPath,
  listingStatusLabel,
  listingTypeLabel,
  parseListingReviewIds,
  type Listing,
} from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { fisherySelectLabelForName } from "@/lib/fisheries/types";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { TableModal } from "@/components/table-modal";
import { ReviewListingForms } from "@/components/review-listing-forms";
import { BulkReviewListingsModal } from "@/components/bulk-review-listings-modal";
import { formatTableDate } from "@/lib/format";

export const metadata = {
  title: "Listings",
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const query = await searchParams;
  const [{ listings, error }, fisheries, jurisdictions] = await Promise.all([
    listAllListings(),
    listFisheries(),
    listJurisdictions(),
  ]);
  const queued = parseListingReviewIds(query.review);
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  const reviewListings = queued
    .map((id) => byId.get(id))
    .filter(
      (listing): listing is Listing =>
        listing != null && listing.status === "PENDING_APPROVAL",
    );
  const remainingPath = listingReviewPath(reviewListings.map((listing) => listing.id));
  const requestedPath = listingReviewPath(queued);

  if (queued.length > 0 && remainingPath !== requestedPath) {
    redirect(remainingPath);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Listings
      </h1>
      {error ? (
        <p className="text-sm text-ink-muted">Could not load listings. {error}</p>
      ) : (
      <DataTable
        caption="Listings"
        empty="No listings yet."
        searchPlaceholder="Filter listings…"
        defaultSort={{ key: "id", direction: "desc" }}
        selectable
        bulkActions={[
          {
            label: "Review",
            action: startListingReviewAction,
            requireValue: {
              key: "status",
              value: "PENDING_APPROVAL",
            },
          },
        ]}
        columns={[
          { key: "id", header: "ID", sortable: true, details: true, nowrap: true },
          { key: "seller", header: "Seller", sortable: true, filter: "select" },
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
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          { key: "price", header: "Price", sortable: true, align: "right" },
          {
            key: "status",
            header: "Status",
            sortable: true,
            filter: "select",
            filterOptions: [
              { value: "PENDING_APPROVAL", label: "Pending approval" },
              { value: "PUBLISHED", label: "Published" },
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
          needsAction: listing.status === "PENDING_APPROVAL",
          details: [
            { label: "Created", value: formatTableDate(listing.created_at) },
          ],
          values: {
            id: listing.id,
            seller: listing.seller_name,
            type: listing.listing_type,
            fishery: fisherySelectLabelForName(
              listing.fishery_name,
              fisheries,
              jurisdictions,
            ),
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
                href={
                  listing.listing_type === "AUCTION"
                    ? `/auctions/${listing.id}`
                    : `/marketplace/${listing.id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className={tableLinkClassName}
              >
                View
              </Link>
            }
            actions={
              listing.status === "PENDING_APPROVAL" ? (
                <TableModal title="Review listing" label="Review">
                  <ReviewListingForms listingId={listing.id} />
                </TableModal>
              ) : null
            }
          />
        ))}
      </DataTable>
      )}
      {reviewListings.length > 0 ? (
        <BulkReviewListingsModal count={reviewListings.length}>
          {reviewListings.map((listing, index) => (
            <section key={listing.id} className="space-y-4 py-6 first:pt-0 last:pb-0">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                  {index + 1} of {reviewListings.length}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-ink">
                  Listing {listing.id} · {listing.seller_name}
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {listingTypeLabel(listing.listing_type)} ·{" "}
                  {listingOfferingLabel(listing.offering)} ·{" "}
                  {fisherySelectLabelForName(
                    listing.fishery_name,
                    fisheries,
                    jurisdictions,
                  )}{" "}
                  · {listing.quantity} {listing.unit_label} ·{" "}
                  {formatAud(listing.unit_price_aud)}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Expires {formatTableDate(listing.expires_at)}
                </p>
              </div>
              <ReviewListingForms
                listingId={listing.id}
                reviewQueue={reviewListings.map((item) => item.id)}
              />
            </section>
          ))}
        </BulkReviewListingsModal>
      ) : null}
    </div>
  );
}

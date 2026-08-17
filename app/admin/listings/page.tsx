import Link from "next/link";
import { redirect } from "next/navigation";
import {
  approveListingAction,
  rejectListingAction,
} from "@/lib/listings/actions";
import { listAllListings } from "@/lib/listings/queries";
import {
  formatAud,
  listingOfferingLabel,
  listingStatusLabel,
  listingTypeLabel,
} from "@/lib/listings/types";
import { isPlatformAdmin } from "@/lib/admin/access";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { fisherySelectLabelForName } from "@/lib/fisheries/types";
import {
  fieldClassName,
  tableButtonClassName,
} from "@/components/auth-card";
import { DataTable, DataTableRowExtras, tableLinkClassName } from "@/components/data-table";
import { TableModal } from "@/components/table-modal";
import { formatTableDate } from "@/lib/format";

export const metadata = {
  title: "Listings",
};

export default async function AdminListingsPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const [{ listings, error }, fisheries, jurisdictions] = await Promise.all([
    listAllListings(),
    listFisheries(),
    listJurisdictions(),
  ]);

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
            header: "Type",
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
                  <div className="space-y-4">
                    <form
                      id={`approve-listing-${listing.id}`}
                      action={approveListingAction}
                    >
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <button type="submit" className={tableButtonClassName}>
                        Approve
                      </button>
                    </form>
                    <form action={rejectListingAction} className="space-y-3">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <div>
                        <label
                          htmlFor={`reject-note-${listing.id}`}
                          className="block text-sm text-ink"
                        >
                          Reason (optional)
                        </label>
                        <input
                          id={`reject-note-${listing.id}`}
                          name="review_note"
                          className={fieldClassName}
                        />
                      </div>
                      <button type="submit" className={tableButtonClassName}>
                        Reject
                      </button>
                    </form>
                    <div>
                      <label
                        htmlFor={`approve-note-${listing.id}`}
                        className="block text-sm text-ink"
                      >
                        Note (optional)
                      </label>
                      <input
                        id={`approve-note-${listing.id}`}
                        name="review_note"
                        form={`approve-listing-${listing.id}`}
                        className={fieldClassName}
                      />
                    </div>
                  </div>
                </TableModal>
              ) : null
            }
          />
        ))}
      </DataTable>
      )}
    </div>
  );
}

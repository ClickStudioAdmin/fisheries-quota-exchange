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
import {
  fieldClassName,
  tableButtonClassName,
  tableSecondaryButtonClassName,
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

  const listings = await listAllListings();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Listing approval
      </h1>
      <DataTable
        caption="Listings"
        empty="No listings yet."
        searchPlaceholder="Filter listings…"
        defaultSort={{ key: "created", direction: "desc" }}
        columns={[
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
          { key: "fishery", header: "Fishery", sortable: true, filter: "select" },
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
          { key: "quantity", header: "Quantity", sortable: true, align: "right" },
          { key: "price", header: "Price", sortable: true, align: "right" },
          { key: "created", header: "Created", sortable: true },
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
          values: {
            seller: listing.seller_name,
            type: listing.listing_type,
            fishery: listing.fishery_name,
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
            created: formatTableDate(listing.created_at),
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
                className={tableLinkClassName}
              >
                View
              </Link>
            }
            actions={
              listing.status === "PENDING_APPROVAL" ? (
                <TableModal title="Review listing" label="Review">
                  <div className="space-y-4">
                    <form action={approveListingAction} className="space-y-3">
                      <input type="hidden" name="listing_id" value={listing.id} />
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
                          className={fieldClassName}
                        />
                      </div>
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
                      <button
                        type="submit"
                        className={tableSecondaryButtonClassName}
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </TableModal>
              ) : null
            }
          />
        ))}
      </DataTable>
    </div>
  );
}

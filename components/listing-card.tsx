import Link from "next/link";
import {
  formatAud,
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
} from "@/lib/listings/types";
import { AuctionCard } from "@/components/auction-card";

type ListingCardProps = {
  listing: Listing;
};

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="block border border-line p-4 hover:bg-paper-raised"
    >
      <p className="font-medium text-ink">
        {listing.fishery_name} · {listing.stock_name}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {listingTypeLabel(listing.listing_type)} ·{" "}
        {listingOfferingLabel(listing.offering)} · {listing.quantity}{" "}
        {listing.unit_label} · {formatAud(listing.unit_price_aud)} /{" "}
        {listing.unit_label}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {listing.seller_name} · {listing.season_name}
      </p>
    </Link>
  );
}

export function MarketplaceListingCard({ listing }: ListingCardProps) {
  if (listing.listing_type === "AUCTION") {
    return <AuctionCard listing={listing} />;
  }

  return <ListingCard listing={listing} />;
}

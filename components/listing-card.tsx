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

export function ListingCards({
  listings,
  empty,
}: {
  listings: Listing[];
  empty: string;
}) {
  if (listings.length === 0) {
    return <p className="text-sm text-ink-muted">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <MarketplaceListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

export function FisheryOfferingSection({
  title,
  listings,
}: {
  title: "Sales" | "Leases";
  listings: Listing[];
}) {
  const fixed = listings.filter((item) => item.listing_type !== "AUCTION");
  const auctions = listings.filter((item) => item.listing_type === "AUCTION");
  const kind = title === "Sales" ? "sale" : "lease";

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-6 space-y-8">
        <div>
          <h3 className="text-base font-semibold text-ink">Fixed price</h3>
          <div className="mt-3">
            <ListingCards
              listings={fixed}
              empty={`No fixed-price ${kind}s at the moment.`}
            />
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink">Auctions</h3>
          <div className="mt-3">
            <ListingCards
              listings={auctions}
              empty={`No ${kind} auctions at the moment.`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

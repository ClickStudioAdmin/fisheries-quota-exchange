import Link from "next/link";
import { formatAud, type Listing } from "@/lib/listings/types";

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
        {listing.offering} · {listing.quantity} {listing.unit_label} ·{" "}
        {formatAud(listing.unit_price_aud)} / {listing.unit_label}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {listing.seller_name} · {listing.season_name}
      </p>
    </Link>
  );
}

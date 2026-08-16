import Link from "next/link";
import { formatAud, type Listing } from "@/lib/listings/types";
import { auctionHasEnded, auctionHasStarted } from "@/lib/auctions/types";

type AuctionCardProps = {
  listing: Listing;
};

export function AuctionCard({ listing }: AuctionCardProps) {
  const ended = auctionHasEnded(listing);
  const started = auctionHasStarted(listing);
  const label = ended
    ? listing.status === "PUBLISHED"
      ? "Ended — waiting to close"
      : listing.status
    : started
      ? "Live"
      : "Scheduled";

  return (
    <Link
      href={`/auctions/${listing.id}`}
      className="block border border-line p-4 hover:bg-paper-raised"
    >
      <p className="font-medium text-ink">
        {listing.fishery_name} · {listing.stock_name}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {listing.offering} · {listing.quantity} {listing.unit_label} · current{" "}
        {formatAud(listing.unit_price_aud)} / {listing.unit_label}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {listing.seller_name} · {label} · ends{" "}
        {new Date(listing.expires_at).toLocaleString("en-AU")}
      </p>
    </Link>
  );
}

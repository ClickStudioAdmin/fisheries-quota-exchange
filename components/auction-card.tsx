import { OfferCard } from "@/components/offer-card";
import { formatTableDateTime } from "@/lib/format";
import { auctionHasEnded, auctionHasStarted } from "@/lib/auctions/types";
import type { Listing } from "@/lib/listings/types";

type AuctionCardProps = {
  listing: Listing;
  hideFishery?: boolean;
  hideOffering?: boolean;
  fisheryId?: number | null;
};

export function AuctionCard({
  listing,
  hideFishery,
  hideOffering,
  fisheryId,
}: AuctionCardProps) {
  const ended = auctionHasEnded(listing);
  const started = auctionHasStarted(listing);
  const badge = ended
    ? listing.status === "PUBLISHED"
      ? "Ended — waiting to close"
      : listing.status
    : started
      ? "Live"
      : "Scheduled";

  return (
    <OfferCard
      listing={listing}
      href={`/auctions/${listing.id}`}
      priceLabel="Current price"
      badge={badge}
      hideFishery={hideFishery}
      hideOffering={hideOffering}
      fisheryId={fisheryId}
      extraFields={[
        { label: "Ends", value: formatTableDateTime(listing.expires_at) },
      ]}
    />
  );
}

import { OfferCard } from "@/components/offer-card";
import { formatTableDate } from "@/lib/format";
import { auctionHasEnded, auctionHasStarted } from "@/lib/auctions/types";
import type { Fishery } from "@/lib/fisheries/types";
import type { Listing } from "@/lib/listings/types";

type AuctionCardProps = {
  listing: Listing;
  hideFishery?: boolean;
  hideOffering?: boolean;
  fisheryId?: number | null;
  fishery?: Pick<Fishery, "name" | "logo_path"> | null;
};

export function AuctionCard({
  listing,
  hideFishery,
  hideOffering,
  fisheryId,
  fishery,
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
      priceLabel="Current bid"
      badge={badge}
      hideFishery={hideFishery}
      hideOffering={hideOffering}
      fisheryId={fisheryId}
      fishery={fishery}
      extraFields={[
        { label: "Ends", value: formatTableDate(listing.expires_at) },
      ]}
    />
  );
}

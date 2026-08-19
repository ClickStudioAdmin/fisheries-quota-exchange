import { AuctionCountdown } from "@/components/auction-countdown";
import { OfferCard } from "@/components/offer-card";
import { formatTableDate } from "@/lib/format";
import { auctionHasEnded, auctionHasStarted } from "@/lib/auctions/types";
import type { Fishery } from "@/lib/fisheries/types";
import type { Listing } from "@/lib/listings/types";
import type { PublicSellerDisplay } from "@/lib/organisations/public-seller";

type AuctionCardProps = {
  listing: Listing;
  hideFishery?: boolean;
  hideOffering?: boolean;
  fisheryId?: number | null;
  fishery?: Pick<Fishery, "name" | "logo_path"> | null;
  sellerDisplay?: PublicSellerDisplay;
};

export function AuctionCard({
  listing,
  hideFishery,
  hideOffering,
  fisheryId,
  fishery,
  sellerDisplay,
}: AuctionCardProps) {
  const ended = auctionHasEnded(listing);
  const started = auctionHasStarted(listing);
  const badge = ended
    ? listing.status === "PUBLISHED"
      ? "Ended — waiting to close"
      : listing.status
    : started
      ? undefined
      : "Scheduled";

  return (
    <OfferCard
      listing={listing}
      href={`/auctions/${listing.id}`}
      priceLabel="Current bid"
      totalLabel="Indicative price"
      badge={badge}
      hideFishery={hideFishery}
      hideOffering={hideOffering}
      fisheryId={fisheryId}
      fishery={fishery}
      sellerDisplay={sellerDisplay}
      metaLabel={ended ? "Ended" : started ? "Time left" : "Starts in"}
      metaValue={
        ended ? (
          formatTableDate(listing.expires_at)
        ) : (
          <AuctionCountdown
            at={started ? listing.expires_at : (listing.starts_at ?? listing.expires_at)}
          />
        )
      }
    />
  );
}

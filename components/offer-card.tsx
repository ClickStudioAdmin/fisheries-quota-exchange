import Link from "next/link";
import { LabeledFields, panelClassName } from "@/components/surface";
import {
  formatAud,
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
} from "@/lib/listings/types";

type OfferCardProps = {
  listing: Listing;
  href: string;
  priceLabel?: string;
  badge?: string;
  extraFields?: { label: string; value: string }[];
  hideFishery?: boolean;
  hideOffering?: boolean;
  fisheryId?: number | null;
};

export function OfferCard({
  listing,
  href,
  priceLabel = "Price",
  badge,
  extraFields = [],
  hideFishery = false,
  hideOffering = false,
  fisheryId = null,
}: OfferCardProps) {
  const title = hideFishery ? listing.seller_name : listing.fishery_name;
  const fields = [
    {
      label: "Quantity",
      value: `${listing.quantity} ${listing.unit_label}`,
    },
    {
      label: priceLabel,
      value: `${formatAud(listing.unit_price_aud)} / ${listing.unit_label}`,
    },
    ...(hideOffering
      ? []
      : [{ label: "Type", value: listingOfferingLabel(listing.offering) }]),
    ...(hideFishery ? [] : [{ label: "Seller", value: listing.seller_name }]),
    ...extraFields,
  ];
  const showFisheryLink = !hideFishery && fisheryId != null;

  return (
    <article className={`${panelClassName} p-0 transition-colors hover:border-sea`}>
      <Link href={href} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-ink">{title}</p>
            {listing.stock_name || listing.season_name ? (
              <p className="mt-1 text-sm text-ink-muted">
                {[listing.stock_name, listing.season_name]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs uppercase tracking-[0.12em] text-sea">
              {listingTypeLabel(listing.listing_type)}
            </p>
            {badge ? (
              <p className="mt-1 text-xs text-ink-muted">{badge}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <LabeledFields items={fields} />
        </div>
      </Link>
      {showFisheryLink ? (
        <p className="border-t border-line px-5 py-3">
          <Link href={`/fisheries/${fisheryId}`} className="text-sm underline">
            View fishery
          </Link>
        </p>
      ) : null}
    </article>
  );
}

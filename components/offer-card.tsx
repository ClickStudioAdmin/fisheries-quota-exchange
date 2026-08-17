import Link from "next/link";
import { FisheryLogo } from "@/components/fishery-logo";
import { LabeledFields, panelClassName } from "@/components/surface";
import type { Fishery } from "@/lib/fisheries/types";
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
  fishery?: Pick<Fishery, "name" | "logo_path"> | null;
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
  fishery = null,
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
  const logoFishery =
    fishery ??
    (hideFishery ? null : { name: listing.fishery_name, logo_path: null });
  const subtitle = [listing.stock_name, listing.season_name]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`${panelClassName} flex items-stretch p-0 transition-colors hover:border-sea`}
    >
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-4 p-4">
        {logoFishery ? <FisheryLogo fishery={logoFishery} size="sm" /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate">
              <span className="font-medium text-ink">{title}</span>
              {subtitle ? (
                <span className="text-sm text-ink-muted"> · {subtitle}</span>
              ) : null}
            </p>
            <p className="shrink-0 text-xs uppercase tracking-[0.12em] text-sea">
              {listingTypeLabel(listing.listing_type)}
              {badge ? (
                <span className="ml-2 normal-case tracking-normal text-ink-muted">
                  {badge}
                </span>
              ) : null}
            </p>
          </div>
          <div className="mt-2">
            <LabeledFields items={fields} columns={5} />
          </div>
        </div>
      </Link>
      {showFisheryLink ? (
        <p className="flex shrink-0 items-center border-l border-line px-4">
          <Link href={`/fisheries/${fisheryId}`} className="text-sm underline">
            View fishery
          </Link>
        </p>
      ) : null}
    </article>
  );
}

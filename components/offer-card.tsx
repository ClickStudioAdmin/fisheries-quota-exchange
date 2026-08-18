import Link from "next/link";
import { FisheryLogo } from "@/components/fishery-logo";
import { LabeledFields } from "@/components/surface";
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

function KindBadge({
  children,
  tone,
}: {
  children: string;
  tone: "filled" | "outline";
}) {
  return (
    <span
      className={
        tone === "filled"
          ? "bg-sea px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-paper"
          : "border border-line bg-paper px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink"
      }
    >
      {children}
    </span>
  );
}

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
    ...(hideFishery ? [] : [{ label: "Seller", value: listing.seller_name }]),
    ...extraFields,
  ];
  const showFisheryLink = !hideFishery && fisheryId != null;
  const logoFishery =
    fishery ??
    (hideFishery ? null : { name: listing.fishery_name, logo_path: null });

  return (
    <article
      className="flex h-full min-w-0 flex-col border border-line bg-paper-raised transition-colors hover:border-sea"
    >
      <Link href={href} className="flex min-w-0 flex-1 flex-col gap-4 p-5">
        <div className="flex min-w-0 items-start gap-4">
          {logoFishery ? <FisheryLogo fishery={logoFishery} size="md" /> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {hideOffering ? null : (
                <KindBadge tone="filled">
                  {listingOfferingLabel(listing.offering)}
                </KindBadge>
              )}
              <KindBadge tone="outline">
                {listingTypeLabel(listing.listing_type)}
              </KindBadge>
              {badge ? (
                <span className="text-xs text-ink-muted">{badge}</span>
              ) : null}
            </div>
            <p className="mt-3 truncate font-semibold text-ink">{title}</p>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            {priceLabel}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {formatAud(listing.unit_price_aud)}
            <span className="text-sm font-normal text-ink-muted">
              {" "}
              / {listing.unit_label}
            </span>
          </p>
        </div>
        {fields.length > 0 ? (
          <LabeledFields items={fields} columns={2} />
        ) : null}
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

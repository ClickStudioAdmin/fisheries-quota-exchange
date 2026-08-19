import type { ReactNode } from "react";
import Link from "next/link";
import { FisheryLogo } from "@/components/fishery-logo";
import { PublicSellerName } from "@/components/public-seller-name";
import type { Fishery } from "@/lib/fisheries/types";
import {
  formatAud,
  formatListingTotal,
  listingOfferingLabel,
  listingTypeLabel,
  unitPriceSuffix,
  type Listing,
} from "@/lib/listings/types";
import type { PublicSellerDisplay } from "@/lib/organisations/public-seller";

type OfferCardProps = {
  listing: Listing;
  href: string;
  priceLabel?: string;
  totalLabel?: string;
  badge?: string;
  metaLabel?: string;
  metaValue?: ReactNode;
  hideFishery?: boolean;
  hideOffering?: boolean;
  fisheryId?: number | null;
  fishery?: Pick<Fishery, "name" | "logo_path"> | null;
  sellerDisplay?: PublicSellerDisplay;
};

function KindBadge({
  children,
  tone,
}: {
  children: string;
  tone: "filled" | "outline";
}) {
  const className =
    tone === "filled"
      ? "bg-sea px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-paper"
      : "border border-line bg-paper px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink";

  return <span className={className}>{children}</span>;
}

export function ListingKindBadges({
  listing,
  hideOffering = false,
  badge,
}: {
  listing: Pick<Listing, "offering" | "listing_type">;
  hideOffering?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      {hideOffering ? null : (
        <KindBadge tone="filled">
          {listingOfferingLabel(listing.offering)}
        </KindBadge>
      )}
      <KindBadge tone="outline">
        {listingTypeLabel(listing.listing_type)}
      </KindBadge>
      {badge && badge !== "Live" ? (
        <KindBadge tone="outline">{badge}</KindBadge>
      ) : null}
    </div>
  );
}

function formatQuantity(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 6 }).format(
    amount,
  );
}

function OfferStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
        {detail ? (
          <span className="text-sm font-normal text-ink-muted"> {detail}</span>
        ) : null}
      </p>
    </div>
  );
}

export function OfferCard({
  listing,
  href,
  priceLabel = "Price",
  totalLabel = "Total",
  badge,
  metaLabel,
  metaValue,
  hideFishery = false,
  hideOffering = false,
  fisheryId = null,
  fishery = null,
  sellerDisplay,
}: OfferCardProps) {
  const seller = sellerDisplay ?? {
    label: listing.seller_name,
    tooltip: null,
  };
  const showFisheryLink = !hideFishery && fisheryId != null;
  const logoFishery =
    fishery ??
    (hideFishery ? null : { name: listing.fishery_name, logo_path: null });
  const showMeta = Boolean(metaLabel && metaValue != null) || showFisheryLink;

  return (
    <article className="flex h-full min-w-0 flex-col border border-line bg-paper-raised transition-colors hover:border-sea">
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <Link href={href} className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-start gap-4">
            {logoFishery ? <FisheryLogo fishery={logoFishery} size="md" /> : null}
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="min-w-0 text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  {hideFishery ? (
                    <PublicSellerName display={seller} />
                  ) : (
                    <span className="block truncate">{listing.fishery_name}</span>
                  )}
                </p>
                {hideFishery ? null : (
                  <p className="mt-1 min-w-0 text-sm text-ink-muted">
                    <PublicSellerName display={seller} />
                  </p>
                )}
              </div>
              <ListingKindBadges
                listing={listing}
                hideOffering={hideOffering}
                badge={badge}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <OfferStat
              label="Quantity"
              value={formatQuantity(listing.quantity)}
              detail={listing.unit_label}
            />
            <OfferStat
              label={priceLabel}
              value={formatAud(listing.unit_price_aud)}
              detail={`/ ${unitPriceSuffix(listing.unit_label)}`}
            />
            <OfferStat
              label={totalLabel}
              value={formatListingTotal(
                listing.quantity,
                listing.unit_price_aud,
              )}
            />
          </div>
        </Link>
        {showMeta ? (
          <div className="mt-4 flex items-end justify-between gap-3">
            {metaLabel && metaValue != null ? (
              <Link href={href} className="min-w-0">
                <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                  {metaLabel}
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-ink">{metaValue}</p>
              </Link>
            ) : (
              <span />
            )}
            {showFisheryLink ? (
              <Link href={`/fisheries/${fisheryId}`} className="shrink-0 text-sm underline">
                View fishery
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

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
  tone: "filled" | "outline" | "live";
}) {
  const className =
    tone === "filled"
      ? "bg-sea px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-paper"
      : tone === "live"
        ? "border border-sea px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sea"
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
      {badge ? (
        <KindBadge tone={badge === "Live" ? "live" : "outline"}>{badge}</KindBadge>
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
  badge,
  extraFields = [],
  hideFishery = false,
  hideOffering = false,
  fisheryId = null,
  fishery = null,
}: OfferCardProps) {
  const title = hideFishery ? listing.seller_name : listing.fishery_name;
  const showFisheryLink = !hideFishery && fisheryId != null;
  const logoFishery =
    fishery ??
    (hideFishery ? null : { name: listing.fishery_name, logo_path: null });

  return (
    <article className="flex h-full min-w-0 flex-col border border-line bg-paper-raised transition-colors hover:border-sea">
      <Link href={href} className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-start gap-4 p-5">
          {logoFishery ? <FisheryLogo fishery={logoFishery} size="md" /> : null}
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl">
                {title}
              </p>
              {hideFishery ? null : (
                <p className="mt-1 truncate text-sm text-ink-muted">
                  {listing.seller_name}
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
        <div className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4">
          <OfferStat
            label="Quantity"
            value={formatQuantity(listing.quantity)}
            detail={listing.unit_label}
          />
          <OfferStat
            label={priceLabel}
            value={formatAud(listing.unit_price_aud)}
            detail={`/ ${listing.unit_label}`}
          />
        </div>
        {extraFields.length > 0 ? (
          <div className="border-t border-line px-5 py-4">
            <LabeledFields items={extraFields} columns={2} />
          </div>
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

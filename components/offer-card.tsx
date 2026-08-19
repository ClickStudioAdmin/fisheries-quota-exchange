"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FisheryLogo } from "@/components/fishery-logo";
import { ListingKindBadges } from "@/components/listing-kind-badges";
import { PublicSellerName } from "@/components/public-seller-name";
import type { Fishery } from "@/lib/fisheries/types";
import {
  formatAud,
  formatListingTotal,
  unitPriceSuffix,
  type Listing,
} from "@/lib/listings/types";
import type { PublicSellerDisplay } from "@/lib/organisations/public-seller";

type OfferStatProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  tabular?: boolean;
};

type OfferCardProps = {
  listing: Listing;
  href?: string;
  priceLabel?: string;
  totalLabel?: string;
  badge?: string;
  metaLabel?: string;
  metaValue?: ReactNode;
  extraStats?: OfferStatProps[];
  hideFishery?: boolean;
  hideOffering?: boolean;
  fisheryId?: number | null;
  fishery?: Pick<Fishery, "name" | "logo_path"> | null;
  sellerDisplay?: PublicSellerDisplay;
};

function formatQuantity(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 6 }).format(
    amount,
  );
}

export function OfferStat({
  label,
  value,
  detail,
  tabular = true,
}: OfferStatProps) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <div
        className={`mt-1 text-2xl font-semibold tracking-tight text-ink ${
          tabular ? "tabular-nums" : ""
        }`}
      >
        {value}
        {detail ? (
          <span className="text-sm font-normal text-ink-muted"> {detail}</span>
        ) : null}
      </div>
    </div>
  );
}

function MetaBlock({
  href,
  label,
  value,
}: {
  href?: string;
  label: string;
  value: ReactNode;
}) {
  const body = (
    <>
      <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm tabular-nums text-ink">{value}</p>
    </>
  );

  if (!href) {
    return <div className="min-w-0">{body}</div>;
  }

  return (
    <Link href={href} className="min-w-0">
      {body}
    </Link>
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
  extraStats,
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
  const showFisheryLink = Boolean(href) && !hideFishery && fisheryId != null;
  const logoFishery =
    fishery ??
    (hideFishery ? null : { name: listing.fishery_name, logo_path: null });
  const showMeta = Boolean(metaLabel && metaValue != null) || showFisheryLink;
  const TitleTag = href ? "p" : "h1";
  const titleClassName = href
    ? "min-w-0 text-lg font-semibold tracking-tight text-ink sm:text-xl"
    : "min-w-0 text-2xl font-semibold tracking-tight text-ink sm:text-3xl";

  const logo = logoFishery ? (
    <FisheryLogo fishery={logoFishery} size={href ? "md" : "lg"} />
  ) : null;
  const title = hideFishery ? (
    <PublicSellerName display={seller} />
  ) : (
    <span className="block truncate">{listing.fishery_name}</span>
  );
  const sellerLine = hideFishery ? null : (
    <p className="mt-1 min-w-0 text-sm text-ink-muted">
      <PublicSellerName display={seller} />
    </p>
  );
  const badges = (
    <ListingKindBadges
      listing={listing}
      hideOffering={hideOffering}
      badge={badge}
    />
  );

  const headerAndStats = (
    <>
      <div className="flex min-w-0 items-start gap-4">
        {logo}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div className="min-w-0">
            <TitleTag className={titleClassName}>{title}</TitleTag>
            {sellerLine}
          </div>
          {badges}
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
      {extraStats && extraStats.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {extraStats.map((stat) => (
            <OfferStat key={stat.label} {...stat} />
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <article
      className={`flex h-full min-w-0 flex-col border border-line bg-paper-raised${
        href ? " transition-colors hover:border-sea" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col p-5">
        {href ? (
          <Link href={href} className="flex min-w-0 flex-1 flex-col">
            {headerAndStats}
          </Link>
        ) : (
          headerAndStats
        )}
        {showMeta ? (
          <div className="mt-4 flex items-end justify-between gap-3">
            {metaLabel && metaValue != null ? (
              <MetaBlock href={href} label={metaLabel} value={metaValue} />
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

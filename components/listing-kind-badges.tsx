import { statusToneClass } from "@/components/status-badge";
import {
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
} from "@/lib/listings/types";

function KindBadge({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function offeringClassName(offering: Listing["offering"]) {
  return offering === "SALE"
    ? "bg-sea text-paper"
    : "bg-sea/15 text-sea";
}

function listingTypeClassName(type: Listing["listing_type"]) {
  return type === "AUCTION"
    ? "bg-ink text-paper"
    : "border border-line bg-paper-raised text-ink";
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
        <KindBadge className={offeringClassName(listing.offering)}>
          {listingOfferingLabel(listing.offering)}
        </KindBadge>
      )}
      <KindBadge className={listingTypeClassName(listing.listing_type)}>
        {listingTypeLabel(listing.listing_type)}
      </KindBadge>
      {badge && badge !== "Live" ? (
        <KindBadge className={statusToneClass(badge)}>{badge}</KindBadge>
      ) : null}
    </div>
  );
}

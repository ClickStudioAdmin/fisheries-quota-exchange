import {
  listingOfferingLabel,
  listingTypeLabel,
  type Listing,
} from "@/lib/listings/types";

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

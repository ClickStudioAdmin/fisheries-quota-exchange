import Link from "next/link";
import { buttonClassName } from "@/components/auth-card";
import { FisheryCard } from "@/components/fishery-card";
import { HomeHeroSlider, type HomeHeroSlide } from "@/components/home-hero-slider";
import { ListingCards } from "@/components/listing-card";
import { pageWidthClassName } from "@/components/surface";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import {
  jurisdictionLabel,
  quantityTypeLabel,
} from "@/lib/fisheries/types";
import { listMarketplaceListings } from "@/lib/listings/queries";
import {
  formatAudPerUnit,
  openListingCountsByFisheryName,
} from "@/lib/listings/types";
import { listLatestSalePrices, latestSalePriceMap } from "@/lib/market/queries";
import { registrationsAllowed } from "@/lib/settings/queries";
import { getUser } from "@/lib/supabase/server";

const outlineButtonClassName =
  "border border-line bg-paper-raised px-4 py-2 text-sm font-medium text-ink hover:border-sea";

export default async function Home() {
  const [listings, fisheries, jurisdictions, prices, user, allowRegister] =
    await Promise.all([
      listMarketplaceListings(),
      listFisheries(),
      listJurisdictions(),
      listLatestSalePrices(),
      getUser(),
      registrationsAllowed(),
    ]);

  const now = Date.now();
  const openListings = listings.filter(
    (listing) => new Date(listing.expires_at).getTime() > now,
  );
  const featuredListings = openListings.slice(0, 6);
  const listingCounts = openListingCountsByFisheryName(listings);
  const lastSale = latestSalePriceMap(prices);
  const featuredFisheries = [...fisheries]
    .sort((a, b) => {
      const aCount =
        (listingCounts[a.name]?.sale ?? 0) + (listingCounts[a.name]?.lease ?? 0);
      const bCount =
        (listingCounts[b.name]?.sale ?? 0) + (listingCounts[b.name]?.lease ?? 0);
      return bCount - aCount;
    })
    .slice(0, 6);
  const heroSlides: HomeHeroSlide[] = [...fisheries]
    .sort((a, b) => {
      const aCount =
        (listingCounts[a.name]?.sale ?? 0) + (listingCounts[a.name]?.lease ?? 0);
      const bCount =
        (listingCounts[b.name]?.sale ?? 0) + (listingCounts[b.name]?.lease ?? 0);
      if (Boolean(b.logo_path) !== Boolean(a.logo_path)) {
        return a.logo_path ? -1 : 1;
      }
      return bCount - aCount;
    })
    .slice(0, 6)
    .map((fishery) => {
      const jurisdiction = jurisdictions.find(
        (item) => item.id === fishery.jurisdiction_id,
      );
      const sale = lastSale.get(fishery.id);
      const unit = quantityTypeLabel(fishery.quantity_type);
      const counts = listingCounts[fishery.name] ?? { sale: 0, lease: 0 };

      return {
        fishery,
        jurisdiction: jurisdictionLabel(jurisdiction),
        lastSale: sale
          ? formatAudPerUnit(sale.unit_price_aud, unit)
          : "No sales yet",
        openLabel: `${counts.sale} sale · ${counts.lease} lease`,
      };
    });
  const fisheriesByName = new Map(
    fisheries.map((fishery) => [fishery.name, fishery]),
  );
  const openAuctions = openListings.filter(
    (listing) => listing.listing_type === "AUCTION",
  ).length;
  const openFixed = openListings.length - openAuctions;

  return (
    <div>
      <section className="bg-paper-stripe">
        <div
          className={`${pageWidthClassName} grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20`}
        >
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-sea">
              Australia
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Trade commercial fisheries quota
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
              Fisheries Quota Exchange (FQX) is a marketplace for Australian
              Commonwealth, state and territory quota. Buy, sell, or lease at a
              fixed price, or bid in an English auction.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/marketplace" className={buttonClassName}>
                Browse marketplace
              </Link>
              <Link href="/fisheries" className={outlineButtonClassName}>
                View fisheries
              </Link>
              {user ? (
                <Link href="/dashboard" className={outlineButtonClassName}>
                  Dashboard
                </Link>
              ) : allowRegister ? (
                <Link href="/register" className={outlineButtonClassName}>
                  Register
                </Link>
              ) : (
                <Link href="/login" className={outlineButtonClassName}>
                  Log in
                </Link>
              )}
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              This is a development site, not a live market.
            </p>
          </div>
          <HomeHeroSlider slides={heroSlides} />
        </div>
      </section>

      <section className="border-y border-line bg-paper-raised">
        <div className={`${pageWidthClassName} grid gap-4 py-8 sm:grid-cols-3`}>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Open listings
            </p>
            <p className="mt-2 text-3xl font-semibold text-ink">{openFixed}</p>
            <p className="mt-1 text-sm text-ink-muted">Fixed price</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Open auctions
            </p>
            <p className="mt-2 text-3xl font-semibold text-ink">
              {openAuctions}
            </p>
            <p className="mt-1 text-sm text-ink-muted">English auctions</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Fisheries
            </p>
            <p className="mt-2 text-3xl font-semibold text-ink">
              {fisheries.length}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {jurisdictions.length} jurisdictions
            </p>
          </div>
        </div>
      </section>

      <section className={`${pageWidthClassName} py-12 sm:py-16`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Current listings
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Fixed-price offers and auctions that are open now.
            </p>
          </div>
          <Link href="/marketplace" className="text-sm underline">
            All listings
          </Link>
        </div>
        <div className="mt-6">
          <ListingCards
            listings={featuredListings}
            empty="No published listings at the moment."
            fisheriesByName={fisheriesByName}
          />
        </div>
      </section>

      <section className={`${pageWidthClassName} pb-16 sm:pb-20`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Fisheries
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Open a fishery for prices, current offers, and recent trades.
            </p>
          </div>
          <Link href="/fisheries" className="text-sm underline">
            All fisheries
          </Link>
        </div>
        {featuredFisheries.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">
            No fisheries have been created yet.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {featuredFisheries.map((fishery) => {
              const jurisdiction = jurisdictions.find(
                (item) => item.id === fishery.jurisdiction_id,
              );
              const sale = lastSale.get(fishery.id);
              const counts = listingCounts[fishery.name] ?? {
                sale: 0,
                lease: 0,
              };

              return (
                <FisheryCard
                  key={fishery.id}
                  fishery={fishery}
                  jurisdiction={jurisdiction}
                  lastSale={sale}
                  listingCounts={counts}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

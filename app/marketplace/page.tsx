import type { Metadata } from "next";
import { MarketplaceList } from "@/components/marketplace-list";
import { PageIntro } from "@/components/page-intro";
import { listFisheries, listJurisdictions } from "@/lib/fisheries/queries";
import { listMarketplaceListings } from "@/lib/listings/queries";

export const metadata: Metadata = {
  title: "Marketplace",
};

export default async function MarketplacePage() {
  const [listings, fisheries, jurisdictions] = await Promise.all([
    listMarketplaceListings(),
    listFisheries(),
    listJurisdictions(),
  ]);

  return (
    <>
      <PageIntro title="Marketplace">
        <p>
          Approved fixed-price listings and English auctions. Purchase or a
          winning bid reserves quota and starts a simulated transaction. There
          is no live payment.
        </p>
      </PageIntro>
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {listings.length === 0 ? (
          <p className="text-ink-muted">No published listings at the moment.</p>
        ) : (
          <MarketplaceList
            listings={listings}
            fisheries={fisheries}
            jurisdictions={jurisdictions}
          />
        )}
      </div>
    </>
  );
}

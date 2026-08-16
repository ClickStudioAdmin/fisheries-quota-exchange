import type { Metadata } from "next";
import { ListingCard } from "@/components/listing-card";
import { PageIntro } from "@/components/page-intro";
import { listPublishedListings } from "@/lib/listings/queries";

export const metadata: Metadata = {
  title: "Marketplace",
};

export default async function MarketplacePage() {
  const listings = await listPublishedListings();

  return (
    <>
      <PageIntro title="Marketplace">
        <p>
          Approved fixed-price listings. Purchase reserves quota and starts a
          simulated transaction. There is no live payment.
        </p>
      </PageIntro>
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {listings.length === 0 ? (
          <p className="text-ink-muted">No published listings at the moment.</p>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { AuctionCard } from "@/components/auction-card";
import { PageIntro } from "@/components/page-intro";
import { listAuctions } from "@/lib/auctions/queries";

export const metadata: Metadata = {
  title: "Auctions",
};

export default async function AuctionsPage() {
  const auctions = await listAuctions();

  return (
    <>
      <PageIntro title="Auctions">
        <p>
          English auctions. Bid time is recorded on the server. A close that
          meets the reserve creates a simulated order and reserves quota. There
          is no live payment.
        </p>
      </PageIntro>
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {auctions.length === 0 ? (
          <p className="text-ink-muted">No auctions at the moment.</p>
        ) : (
          <div className="space-y-3">
            {auctions.map((listing) => (
              <AuctionCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

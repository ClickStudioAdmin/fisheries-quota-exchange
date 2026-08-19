import Link from "next/link";
import { ListingCards } from "@/components/listing-card";
import {
  tableBodyCellClassName,
  tableClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
  tableRowClassName,
  tableWrapClassName,
} from "@/components/table-styles";
import { formatTableDate } from "@/lib/format";
import {
  formatAud,
  formatAudPerUnit,
  type ListingOffering,
} from "@/lib/listings/types";
import {
  listMarketSales,
  listOpenListingsForFishery,
} from "@/lib/market/queries";
import type { Fishery } from "@/lib/fisheries/types";
import { loadPublicSellerDisplays } from "@/lib/organisations/queries";

const OTHER_LISTING_LIMIT = 6;
const RECENT_TRADE_LIMIT = 8;

export async function ListingRelatedMarket({
  fishery,
  currentListingId,
  offering,
}: {
  fishery: Pick<Fishery, "id" | "name" | "logo_path">;
  currentListingId: number;
  offering: ListingOffering;
}) {
  const [listings, trades] = await Promise.all([
    listOpenListingsForFishery(fishery.id),
    listMarketSales(fishery.id),
  ]);
  const now = Date.now();
  const others = listings
    .filter(
      (listing) =>
        listing.id !== currentListingId &&
        new Date(listing.expires_at).getTime() > now,
    )
    .slice(0, OTHER_LISTING_LIMIT);
  const recent = trades
    .filter((trade) => trade.offering === offering)
    .slice(-RECENT_TRADE_LIMIT)
    .reverse();
  const tradeTitle =
    offering === "LEASE" ? "Recent leases" : "Recent sales";
  const fisheriesByName = { [fishery.name]: fishery };
  const sellerDisplays = await loadPublicSellerDisplays(others);

  return (
    <div className="mt-12 space-y-12">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">
            Other live listings
          </h2>
          <Link href={`/fisheries/${fishery.id}`} className="text-sm underline">
            View fishery
          </Link>
        </div>
        <div className="mt-4">
          <ListingCards
            listings={others}
            empty="No other live listings for this fishery."
            hideFishery
            fisheriesByName={fisheriesByName}
            sellerDisplays={sellerDisplays}
          />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-ink">{tradeTitle}</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No {offering === "LEASE" ? "leases" : "sales"} recorded for this
            fishery yet.
          </p>
        ) : (
          <div className={`mt-4 ${tableWrapClassName}`}>
            <table className={tableClassName}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className={tableHeaderCellClassName}>Date</th>
                  <th className={`${tableHeaderCellClassName} text-right`}>
                    Quantity
                  </th>
                  <th className={`${tableHeaderCellClassName} text-right`}>
                    Price
                  </th>
                  <th className={`${tableHeaderCellClassName} text-right`}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((trade, index) => (
                  <tr
                    key={`${trade.created_at}-${trade.unit_price_aud}-${index}`}
                    className={tableRowClassName(index)}
                  >
                    <td className={tableBodyCellClassName}>
                      {formatTableDate(trade.created_at)}
                    </td>
                    <td
                      className={`${tableBodyCellClassName} text-right tabular-nums`}
                    >
                      {trade.quantity} {trade.unit_label}
                    </td>
                    <td
                      className={`${tableBodyCellClassName} text-right tabular-nums`}
                    >
                      {formatAudPerUnit(trade.unit_price_aud, trade.unit_label)}
                    </td>
                    <td
                      className={`${tableBodyCellClassName} text-right tabular-nums`}
                    >
                      {formatAud(trade.amount_aud)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

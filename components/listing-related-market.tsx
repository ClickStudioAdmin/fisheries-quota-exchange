import Link from "next/link";
import { PublicSellerName } from "@/components/public-seller-name";
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
  formatListingTotal,
  listingHref,
  listingOfferingLabel,
  listingTypeLabel,
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
  const sellerDisplays = await loadPublicSellerDisplays(others);

  return (
    <div className="mt-12 grid items-start gap-8 lg:grid-cols-2">
      <section className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">
            Other live listings
          </h2>
          <Link href={`/fisheries/${fishery.id}`} className="text-sm underline">
            View fishery
          </Link>
        </div>
        {others.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No other live listings for this fishery.
          </p>
        ) : (
          <div className={`mt-4 ${tableWrapClassName}`}>
            <table className={`${tableClassName} table-fixed`}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className={`${tableHeaderCellClassName} w-[22%] pl-4`}>
                    Seller
                  </th>
                  <th className={`${tableHeaderCellClassName} w-[18%]`}>
                    Type
                  </th>
                  <th className={`${tableHeaderCellClassName} w-[15%]`}>
                    Quantity
                  </th>
                  <th className={`${tableHeaderCellClassName} w-[15%]`}>
                    Price
                  </th>
                  <th className={`${tableHeaderCellClassName} w-[15%]`}>
                    Total
                  </th>
                  <th className={`${tableHeaderCellClassName} w-[15%] pr-4`}>
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody>
                {others.map((listing, index) => {
                  const seller = sellerDisplays[listing.id] ?? {
                    label: listing.seller_name,
                    tooltip: null,
                  };

                  return (
                    <tr key={listing.id} className={tableRowClassName(index)}>
                      <td className={`${tableBodyCellClassName} pl-4`}>
                        <Link href={listingHref(listing)} className="underline">
                          <PublicSellerName display={seller} />
                        </Link>
                      </td>
                      <td className={tableBodyCellClassName}>
                        {listingOfferingLabel(listing.offering)} ·{" "}
                        {listingTypeLabel(listing.listing_type)}
                      </td>
                      <td className={`${tableBodyCellClassName} tabular-nums`}>
                        {listing.quantity} {listing.unit_label}
                      </td>
                      <td className={`${tableBodyCellClassName} tabular-nums`}>
                        {formatAudPerUnit(
                          listing.unit_price_aud,
                          listing.unit_label,
                        )}
                      </td>
                      <td className={`${tableBodyCellClassName} tabular-nums`}>
                        {formatListingTotal(
                          listing.quantity,
                          listing.unit_price_aud,
                        )}
                      </td>
                      <td className={`${tableBodyCellClassName} pr-4`}>
                        {formatTableDate(listing.expires_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="min-w-0">
        <h2 className="text-xl font-semibold text-ink">{tradeTitle}</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No {offering === "LEASE" ? "leases" : "sales"} recorded for this
            fishery yet.
          </p>
        ) : (
          <div className={`mt-4 ${tableWrapClassName}`}>
            <table className={`${tableClassName} table-fixed`}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className={`${tableHeaderCellClassName} w-1/4 pl-4`}>
                    Quantity
                  </th>
                  <th className={`${tableHeaderCellClassName} w-1/4`}>Price</th>
                  <th className={`${tableHeaderCellClassName} w-1/4`}>Total</th>
                  <th className={`${tableHeaderCellClassName} w-1/4 pr-4`}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((trade, index) => (
                  <tr
                    key={`${trade.created_at}-${trade.unit_price_aud}-${index}`}
                    className={tableRowClassName(index)}
                  >
                    <td
                      className={`${tableBodyCellClassName} pl-4 tabular-nums`}
                    >
                      {trade.quantity} {trade.unit_label}
                    </td>
                    <td className={`${tableBodyCellClassName} tabular-nums`}>
                      {formatAudPerUnit(trade.unit_price_aud, trade.unit_label)}
                    </td>
                    <td className={`${tableBodyCellClassName} tabular-nums`}>
                      {formatAud(trade.amount_aud)}
                    </td>
                    <td className={`${tableBodyCellClassName} pr-4`}>
                      {formatTableDate(trade.created_at)}
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

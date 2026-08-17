import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/listings/types";
import type { LatestSalePrice, MarketSale } from "@/lib/market/types";

function asText(value: unknown) {
  if (value == null) return "";
  return String(value);
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

export async function listOpenListingsForFishery(fisheryId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase.rpc("list_open_listings_for_fishery", {
    p_fishery_id: fisheryId,
  });

  return (data ?? []) as Listing[];
}

export async function listMarketSales(fisheryId: number) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase.rpc("list_market_sales", {
    p_fishery_id: fisheryId,
  });

  return (data ?? []).map(
    (row: Record<string, unknown>): MarketSale => ({
      quantity: asText(row.quantity),
      unit_price_aud: asText(row.unit_price_aud),
      amount_aud: asText(row.amount_aud),
      offering: asText(row.offering),
      unit_label: asText(row.unit_label),
      created_at: asText(row.created_at),
    }),
  );
}

export async function listLatestSalePrices() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase.rpc("latest_sale_prices");

  return (data ?? [])
    .map((row: Record<string, unknown>): LatestSalePrice | null => {
      const fisheryId = asNumber(row.fishery_id);
      if (!Number.isInteger(fisheryId)) {
        return null;
      }

      return {
        fishery_id: fisheryId,
        unit_price_aud: asText(row.unit_price_aud),
        sold_at: asText(row.sold_at),
      };
    })
    .filter((row): row is LatestSalePrice => row != null);
}

export function latestSalePriceMap(prices: LatestSalePrice[]) {
  return new Map(prices.map((price) => [price.fishery_id, price]));
}

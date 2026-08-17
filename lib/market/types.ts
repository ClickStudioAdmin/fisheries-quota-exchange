export type MarketSale = {
  quantity: string;
  unit_price_aud: string;
  amount_aud: string;
  offering: string;
  unit_label: string;
  created_at: string;
};

export type LatestSalePrice = {
  fishery_id: number;
  unit_price_aud: string;
  sold_at: string;
};

export function marketValue(
  quantity: string | number,
  unitPrice: string | number,
) {
  const value = Number(quantity) * Number(unitPrice);
  return Number.isFinite(value) ? value : null;
}

export function averageRecentUnitPrice(
  trades: { unit_price_aud: string }[],
  limit = 5,
) {
  const recent = trades.slice(-limit);
  const prices = recent
    .map((trade) => Number(trade.unit_price_aud))
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0) {
    return null;
  }

  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

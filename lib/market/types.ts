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

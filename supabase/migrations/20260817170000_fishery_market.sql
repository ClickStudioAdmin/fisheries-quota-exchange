-- Public fishery catalogue, open listings, and sale prices for valuation.
-- Sale RPCs return price and quantity only — not buyer or seller identity.

grant select on public.fisheries to anon, authenticated;
grant select on public.jurisdictions to anon, authenticated;

drop policy if exists fisheries_select on public.fisheries;
create policy fisheries_select
on public.fisheries
for select
to anon, authenticated
using (true);

drop policy if exists jurisdictions_select on public.jurisdictions;
create policy jurisdictions_select
on public.jurisdictions
for select
to anon, authenticated
using (true);

create function public.list_open_listings_for_fishery(p_fishery_id bigint)
returns setof public.listings
language sql
stable
security definer
set search_path = public
as $$
    select listings.*
    from public.listings
    join public.quota_holdings as holdings
      on holdings.id = listings.holding_id
    where holdings.fishery_id = p_fishery_id
      and listings.status = 'PUBLISHED'
      and (
          (
              listings.listing_type = 'FIXED_PRICE'
              and listings.expires_at > now()
          )
          or listings.listing_type = 'AUCTION'
      )
    order by listings.created_at desc;
$$;

revoke all on function public.list_open_listings_for_fishery(bigint) from public;
grant execute on function public.list_open_listings_for_fishery(bigint) to anon, authenticated;

create function public.list_market_sales(p_fishery_id bigint)
returns table (
    quantity numeric,
    unit_price_aud numeric,
    amount_aud numeric,
    offering text,
    unit_label text,
    created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
    select
        orders.quantity,
        orders.unit_price_aud,
        orders.amount_aud,
        orders.offering,
        orders.unit_label,
        orders.created_at
    from public.orders
    join public.quota_holdings as holdings
      on holdings.id = orders.holding_id
    where holdings.fishery_id = p_fishery_id
      and orders.offering = 'SALE'
      and orders.status in (
          'AWAITING_COMPLIANCE',
          'AWAITING_TRANSFER',
          'AWAITING_SETTLEMENT',
          'COMPLETED'
      )
    order by orders.created_at;
$$;

revoke all on function public.list_market_sales(bigint) from public;
grant execute on function public.list_market_sales(bigint) to anon, authenticated;

create function public.latest_sale_prices()
returns table (
    fishery_id bigint,
    unit_price_aud numeric,
    sold_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
    select distinct on (holdings.fishery_id)
        holdings.fishery_id,
        orders.unit_price_aud,
        orders.created_at
    from public.orders
    join public.quota_holdings as holdings
      on holdings.id = orders.holding_id
    where orders.offering = 'SALE'
      and orders.status in (
          'AWAITING_COMPLIANCE',
          'AWAITING_TRANSFER',
          'AWAITING_SETTLEMENT',
          'COMPLETED'
      )
    order by holdings.fishery_id, orders.created_at desc;
$$;

revoke all on function public.latest_sale_prices() from public;
grant execute on function public.latest_sale_prices() to anon, authenticated;

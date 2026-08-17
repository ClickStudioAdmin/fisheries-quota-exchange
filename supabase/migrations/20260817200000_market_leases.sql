-- Include lease trades in public market history. Identity is still omitted.

create or replace function public.list_market_sales(p_fishery_id bigint)
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
      and orders.offering in ('SALE', 'LEASE')
      and orders.status in (
          'AWAITING_COMPLIANCE',
          'AWAITING_TRANSFER',
          'AWAITING_SETTLEMENT',
          'COMPLETED'
      )
    order by orders.created_at;
$$;

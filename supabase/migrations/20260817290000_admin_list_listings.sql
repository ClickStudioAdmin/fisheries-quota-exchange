-- Admin listings read bypasses RLS. Four OR policies plus thousands of seed
-- rows time out; PostgREST then looks empty because the app ignored the error.
-- Recreate the fishery listings RPC after stock_name / season_name were dropped.

create function public.admin_list_listings()
returns setof public.listings
language plpgsql
stable
security definer
set search_path = public
as $$
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    return query
    select listings.*
    from public.listings as listings
    order by listings.created_at desc;
end;
$$;

revoke all on function public.admin_list_listings() from public;
grant execute on function public.admin_list_listings() to authenticated;

create or replace function public.list_open_listings_for_fishery(p_fishery_id bigint)
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

notify pgrst, 'reload schema';

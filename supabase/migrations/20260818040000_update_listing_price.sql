-- Sellers can change the unit price on an open fixed-price listing.
-- Auctions with bids cannot be cancelled.

create function public.update_listing_price(
    p_listing_id bigint,
    p_unit_price_aud numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_org bigint;
    v_status text;
    v_type text;
    v_role text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    if p_unit_price_aud is null or p_unit_price_aud <= 0 then
        raise exception 'Price must be greater than zero';
    end if;

    select organisation_id, status, listing_type
    into v_org, v_status, v_type
    from public.listings
    where id = p_listing_id
    for update;

    if not found then
        raise exception 'Listing not found';
    end if;

    if v_type <> 'FIXED_PRICE' then
        raise exception 'Only a fixed-price listing can be edited';
    end if;

    if v_status not in ('PENDING_APPROVAL', 'PUBLISHED') then
        raise exception 'This listing cannot be edited';
    end if;

    v_role := public.user_organisation_role(v_org);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot edit this listing';
    end if;

    update public.listings
    set unit_price_aud = p_unit_price_aud
    where id = p_listing_id;
end;
$$;

revoke all on function public.update_listing_price(bigint, numeric) from public;
grant execute on function public.update_listing_price(bigint, numeric) to authenticated;

create or replace function public.cancel_listing(p_listing_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_org bigint;
    v_status text;
    v_type text;
    v_role text;
    v_bid_count integer;
begin
    select organisation_id, status, listing_type
    into v_org, v_status, v_type
    from public.listings
    where id = p_listing_id
    for update;

    if not found then
        raise exception 'Listing not found';
    end if;

    if v_status not in ('PENDING_APPROVAL', 'PUBLISHED') then
        raise exception 'Listing cannot be cancelled';
    end if;

    v_role := public.user_organisation_role(v_org);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot cancel this listing';
    end if;

    if v_type = 'AUCTION' then
        select count(*) into v_bid_count
        from public.bids
        where listing_id = p_listing_id;

        if v_bid_count > 0 then
            raise exception 'This auction cannot be cancelled because a bid has been placed';
        end if;
    end if;

    update public.listings
    set status = 'CANCELLED'
    where id = p_listing_id;
end;
$$;

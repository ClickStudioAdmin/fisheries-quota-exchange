-- Sellers can change quantity and unit price on an open fixed-price listing
-- when the holding still covers the new quantity.

drop function if exists public.update_listing_price(bigint, numeric);

create function public.update_listing(
    p_listing_id bigint,
    p_quantity numeric,
    p_unit_price_aud numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_listing public.listings%rowtype;
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_committed numeric;
    v_available numeric;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    if p_unit_price_aud is null or p_unit_price_aud <= 0 then
        raise exception 'Price must be greater than zero';
    end if;

    select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

    if not found then
        raise exception 'Listing not found';
    end if;

    if v_listing.listing_type <> 'FIXED_PRICE' then
        raise exception 'Only a fixed-price listing can be edited';
    end if;

    if v_listing.status not in ('PENDING_APPROVAL', 'PUBLISHED') then
        raise exception 'This listing cannot be edited';
    end if;

    v_role := public.user_organisation_role(v_listing.organisation_id);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot edit this listing';
    end if;

    if p_quantity = v_listing.quantity
       and p_unit_price_aud = v_listing.unit_price_aud then
        raise exception 'Quantity and price are unchanged';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = v_listing.holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_committed := public.holding_committed_quantity(v_listing.holding_id);
    v_available := v_holding.quantity - v_committed + v_listing.quantity;

    if p_quantity > v_available then
        raise exception 'Quantity cannot exceed the available holding';
    end if;

    update public.listings
    set
        quantity = p_quantity,
        unit_price_aud = p_unit_price_aud
    where id = p_listing_id;
end;
$$;

revoke all on function public.update_listing(bigint, numeric, numeric) from public;
grant execute on function public.update_listing(bigint, numeric, numeric) to authenticated;

create or replace function public.enforce_listing_holding_cover()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_committed numeric;
begin
    if new.status not in ('PENDING_APPROVAL', 'PUBLISHED') then
        return new;
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = new.holding_id
    for update;

    if not found then
        raise exception 'A holding is required to create a listing';
    end if;

    if new.organisation_id is distinct from v_holding.organisation_id then
        raise exception 'Listing organisation must match the holding';
    end if;

    if v_holding.quantity <= 0 then
        raise exception 'A holding with quantity is required to create a listing';
    end if;

    v_committed := public.holding_committed_quantity(new.holding_id);

    if tg_op = 'UPDATE'
       and old.status in ('PENDING_APPROVAL', 'PUBLISHED')
       and old.holding_id = new.holding_id then
        v_committed := v_committed - old.quantity;
    end if;

    if new.quantity > v_holding.quantity - v_committed then
        raise exception 'Quantity cannot exceed the available holding';
    end if;

    return new;
end;
$$;

drop trigger if exists listings_holding_cover on public.listings;

create trigger listings_holding_cover
before insert or update on public.listings
for each row
execute function public.enforce_listing_holding_cover();

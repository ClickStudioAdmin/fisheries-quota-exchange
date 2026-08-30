-- Queensland transfer forms split quota into unused and used units.
-- Store that split on listings (and snapshot it on orders). Create listing and
-- create auction collect unused and used; omitted values default to unused =
-- quantity and used = 0.

alter table public.listings
    add column if not exists unused_quantity numeric,
    add column if not exists used_quantity numeric;

alter table public.orders
    add column if not exists unused_quantity numeric,
    add column if not exists used_quantity numeric;

alter table public.listings
    drop constraint if exists listings_quota_usage_check;

alter table public.listings
    add constraint listings_quota_usage_check
        check (
            (unused_quantity is null and used_quantity is null)
            or (
                unused_quantity is not null
                and used_quantity is not null
                and unused_quantity >= 0
                and used_quantity >= 0
                and unused_quantity + used_quantity = quantity
            )
        );

alter table public.orders
    drop constraint if exists orders_quota_usage_check;

alter table public.orders
    add constraint orders_quota_usage_check
        check (
            (unused_quantity is null and used_quantity is null)
            or (
                unused_quantity is not null
                and used_quantity is not null
                and unused_quantity >= 0
                and used_quantity >= 0
                and unused_quantity + used_quantity = quantity
            )
        );

create or replace function public.qld_quota_usage(
    p_holding_id bigint,
    p_quantity numeric,
    p_unused_quantity numeric default null,
    p_used_quantity numeric default null
)
returns table (unused_quantity numeric, used_quantity numeric)
language plpgsql
stable
set search_path = public
as $$
declare
    v_qld boolean;
begin
    select exists (
        select 1
        from public.quota_holdings as holdings
        join public.fisheries as fisheries
          on fisheries.id = holdings.fishery_id
        join public.jurisdictions as jurisdictions
          on jurisdictions.id = fisheries.jurisdiction_id
        where holdings.id = p_holding_id
          and jurisdictions.code = 'QLD'
    )
    into v_qld;

    if not coalesce(v_qld, false) then
        if p_unused_quantity is not null or p_used_quantity is not null then
            raise exception 'Used and unused quantities apply only to Queensland listings';
        end if;
        unused_quantity := null;
        used_quantity := null;
        return next;
        return;
    end if;

    if p_unused_quantity is null and p_used_quantity is null then
        unused_quantity := p_quantity;
        used_quantity := 0;
        return next;
        return;
    end if;

    if p_unused_quantity is null or p_used_quantity is null then
        raise exception 'Enter both unused and used quantities';
    end if;

    if p_unused_quantity < 0 or p_used_quantity < 0 then
        raise exception 'Used and unused quantities cannot be negative';
    end if;

    if p_unused_quantity + p_used_quantity is distinct from p_quantity then
        raise exception 'Unused and used quantities must add up to the listing quantity';
    end if;

    unused_quantity := p_unused_quantity;
    used_quantity := p_used_quantity;
    return next;
end;
$$;

revoke all on function public.qld_quota_usage(bigint, numeric, numeric, numeric) from public;

create or replace function public.listings_set_quota_usage()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_unused numeric;
    v_used numeric;
begin
    select usage.unused_quantity, usage.used_quantity
    into v_unused, v_used
    from public.qld_quota_usage(
        new.holding_id,
        new.quantity,
        new.unused_quantity,
        new.used_quantity
    ) as usage;

    new.unused_quantity := v_unused;
    new.used_quantity := v_used;
    return new;
end;
$$;

drop trigger if exists listings_set_quota_usage on public.listings;

create trigger listings_set_quota_usage
before insert or update of holding_id, quantity, unused_quantity, used_quantity
on public.listings
for each row
execute function public.listings_set_quota_usage();

create or replace function public.orders_set_quota_usage()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_listing public.listings%rowtype;
begin
    if new.unused_quantity is not null or new.used_quantity is not null then
        if new.unused_quantity is null
           or new.used_quantity is null
           or new.unused_quantity < 0
           or new.used_quantity < 0
           or new.unused_quantity + new.used_quantity is distinct from new.quantity then
            raise exception 'Unused and used quantities must add up to the order quantity';
        end if;
        return new;
    end if;

    select * into v_listing
    from public.listings
    where id = new.listing_id;

    new.unused_quantity := v_listing.unused_quantity;
    new.used_quantity := v_listing.used_quantity;
    return new;
end;
$$;

drop trigger if exists orders_set_quota_usage on public.orders;

create trigger orders_set_quota_usage
before insert on public.orders
for each row
execute function public.orders_set_quota_usage();

update public.listings as listings
set
    unused_quantity = listings.quantity,
    used_quantity = 0
from public.quota_holdings as holdings
join public.fisheries as fisheries
  on fisheries.id = holdings.fishery_id
join public.jurisdictions as jurisdictions
  on jurisdictions.id = fisheries.jurisdiction_id
where holdings.id = listings.holding_id
  and jurisdictions.code = 'QLD'
  and (
      listings.unused_quantity is null
      or listings.used_quantity is null
  );

update public.listings as listings
set
    unused_quantity = null,
    used_quantity = null
from public.quota_holdings as holdings
join public.fisheries as fisheries
  on fisheries.id = holdings.fishery_id
join public.jurisdictions as jurisdictions
  on jurisdictions.id = fisheries.jurisdiction_id
where holdings.id = listings.holding_id
  and jurisdictions.code is distinct from 'QLD'
  and (
      listings.unused_quantity is not null
      or listings.used_quantity is not null
  );

update public.orders as orders
set
    unused_quantity = listings.unused_quantity,
    used_quantity = listings.used_quantity
from public.listings as listings
where listings.id = orders.listing_id
  and (
      orders.unused_quantity is distinct from listings.unused_quantity
      or orders.used_quantity is distinct from listings.used_quantity
  );

drop function if exists public.create_listing(bigint, text, numeric, numeric, timestamptz);

create function public.create_listing(
    p_holding_id bigint,
    p_offering text,
    p_quantity numeric,
    p_unit_price_aud numeric,
    p_expires_at timestamptz,
    p_unused_quantity numeric default null,
    p_used_quantity numeric default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_id bigint;
    v_seller text;
    v_fishery text;
    v_quota_type text;
    v_kind text;
    v_unit text;
    v_committed numeric;
    v_quantity_type text;
    v_unused numeric;
    v_used numeric;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = p_holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_role := public.user_organisation_role(v_holding.organisation_id);

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot list quota for this organisation';
    end if;

    if p_offering not in ('SALE', 'LEASE') then
        raise exception 'Offering must be SALE or LEASE';
    end if;

    if not coalesce(
        public.fishery_allows_offering(v_holding.fishery_id, p_offering),
        false
    ) then
        raise exception 'This fishery cannot be listed for %', lower(p_offering);
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    select usage.unused_quantity, usage.used_quantity
    into v_unused, v_used
    from public.qld_quota_usage(
        p_holding_id,
        p_quantity,
        p_unused_quantity,
        p_used_quantity
    ) as usage;

    v_committed := public.holding_committed_quantity(p_holding_id);

    if p_quantity > v_holding.quantity - v_committed then
        raise exception 'Quantity cannot exceed the available holding';
    end if;

    if p_unit_price_aud is null or p_unit_price_aud <= 0 then
        raise exception 'Price must be greater than zero';
    end if;

    if p_expires_at is null or p_expires_at <= now() then
        raise exception 'Expiry must be in the future';
    end if;

    select o.legal_name into v_seller
    from public.organisations as o
    where o.id = v_holding.organisation_id;

    select
        fisheries.name,
        fisheries.quantity_type
    into v_fishery, v_quantity_type
    from public.fisheries as fisheries
    where fisheries.id = v_holding.fishery_id;

    v_unit := public.fishery_unit_label(v_quantity_type);
    v_quota_type := v_unit;
    v_kind := case when v_quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end;

    insert into public.listings (
        organisation_id,
        holding_id,
        listing_type,
        offering,
        quantity,
        unused_quantity,
        used_quantity,
        unit_price_aud,
        expires_at,
        status,
        seller_name,
        fishery_name,
        quota_type_name,
        measurement_kind,
        unit_label,
        created_by_email
    )
    values (
        v_holding.organisation_id,
        p_holding_id,
        'FIXED_PRICE',
        p_offering,
        p_quantity,
        v_unused,
        v_used,
        p_unit_price_aud,
        p_expires_at,
        'PENDING_APPROVAL',
        v_seller,
        v_fishery,
        v_quota_type,
        v_kind,
        v_unit,
        public.current_user_email()
    )
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function public.create_listing(bigint, text, numeric, numeric, timestamptz, numeric, numeric) from public;
grant execute on function public.create_listing(bigint, text, numeric, numeric, timestamptz, numeric, numeric) to authenticated;

drop function if exists public.create_auction(bigint, text, numeric, numeric, numeric, numeric, timestamptz, timestamptz);

create function public.create_auction(
    p_holding_id bigint,
    p_offering text,
    p_quantity numeric,
    p_starting_price_aud numeric,
    p_bid_increment_aud numeric,
    p_reserve_price_aud numeric,
    p_starts_at timestamptz,
    p_ends_at timestamptz,
    p_unused_quantity numeric default null,
    p_used_quantity numeric default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_id bigint;
    v_seller text;
    v_fishery text;
    v_quota_type text;
    v_kind text;
    v_unit text;
    v_committed numeric;
    v_starts timestamptz;
    v_quantity_type text;
    v_unused numeric;
    v_used numeric;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = p_holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_role := public.user_organisation_role(v_holding.organisation_id);

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot auction quota for this organisation';
    end if;

    if p_offering not in ('SALE', 'LEASE') then
        raise exception 'Offering must be SALE or LEASE';
    end if;

    if not coalesce(
        public.fishery_allows_offering(v_holding.fishery_id, p_offering),
        false
    ) then
        raise exception 'This fishery cannot be listed for %', lower(p_offering);
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    select usage.unused_quantity, usage.used_quantity
    into v_unused, v_used
    from public.qld_quota_usage(
        p_holding_id,
        p_quantity,
        p_unused_quantity,
        p_used_quantity
    ) as usage;

    v_committed := public.holding_committed_quantity(p_holding_id);

    if p_quantity > v_holding.quantity - v_committed then
        raise exception 'Quantity cannot exceed the available holding';
    end if;

    if p_starting_price_aud is null or p_starting_price_aud <= 0 then
        raise exception 'Starting price must be greater than zero';
    end if;

    if p_bid_increment_aud is null or p_bid_increment_aud <= 0 then
        raise exception 'Bid increment must be greater than zero';
    end if;

    if p_reserve_price_aud is not null and p_reserve_price_aud <= 0 then
        raise exception 'Reserve price must be greater than zero';
    end if;

    v_starts := coalesce(p_starts_at, now());

    if p_ends_at is null or p_ends_at <= now() then
        raise exception 'Auction end must be in the future';
    end if;

    if v_starts >= p_ends_at then
        raise exception 'Auction start must be before the end';
    end if;

    select o.legal_name into v_seller
    from public.organisations as o
    where o.id = v_holding.organisation_id;

    select
        fisheries.name,
        fisheries.quantity_type
    into v_fishery, v_quantity_type
    from public.fisheries as fisheries
    where fisheries.id = v_holding.fishery_id;

    v_unit := public.fishery_unit_label(v_quantity_type);
    v_quota_type := v_unit;
    v_kind := case when v_quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end;

    insert into public.listings (
        organisation_id,
        holding_id,
        listing_type,
        offering,
        quantity,
        unused_quantity,
        used_quantity,
        unit_price_aud,
        expires_at,
        status,
        seller_name,
        fishery_name,
        quota_type_name,
        measurement_kind,
        unit_label,
        created_by_email,
        starting_price_aud,
        reserve_price_aud,
        bid_increment_aud,
        starts_at
    )
    values (
        v_holding.organisation_id,
        p_holding_id,
        'AUCTION',
        p_offering,
        p_quantity,
        v_unused,
        v_used,
        p_starting_price_aud,
        p_ends_at,
        'PENDING_APPROVAL',
        v_seller,
        v_fishery,
        v_quota_type,
        v_kind,
        v_unit,
        public.current_user_email(),
        p_starting_price_aud,
        p_reserve_price_aud,
        p_bid_increment_aud,
        v_starts
    )
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function public.create_auction(bigint, text, numeric, numeric, numeric, numeric, timestamptz, timestamptz, numeric, numeric) from public;
grant execute on function public.create_auction(bigint, text, numeric, numeric, numeric, numeric, timestamptz, timestamptz, numeric, numeric) to authenticated;

drop function if exists public.update_listing(bigint, numeric, numeric);

create function public.update_listing(
    p_listing_id bigint,
    p_quantity numeric,
    p_unit_price_aud numeric,
    p_unused_quantity numeric default null,
    p_used_quantity numeric default null
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
    v_unused numeric;
    v_used numeric;
    v_keep boolean;
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
       and p_unit_price_aud = v_listing.unit_price_aud
       and p_unused_quantity is null
       and p_used_quantity is null then
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

    v_keep :=
        p_unused_quantity is null
        and p_used_quantity is null
        and v_listing.unused_quantity is not null
        and v_listing.used_quantity is not null
        and v_listing.unused_quantity + v_listing.used_quantity is not distinct from p_quantity;

    select usage.unused_quantity, usage.used_quantity
    into v_unused, v_used
    from public.qld_quota_usage(
        v_listing.holding_id,
        p_quantity,
        case
            when v_keep then v_listing.unused_quantity
            else p_unused_quantity
        end,
        case
            when v_keep then v_listing.used_quantity
            else p_used_quantity
        end
    ) as usage;

    update public.listings
    set
        quantity = p_quantity,
        unused_quantity = v_unused,
        used_quantity = v_used,
        unit_price_aud = p_unit_price_aud
    where id = p_listing_id;
end;
$$;

revoke all on function public.update_listing(bigint, numeric, numeric, numeric, numeric) from public;
grant execute on function public.update_listing(bigint, numeric, numeric, numeric, numeric) to authenticated;

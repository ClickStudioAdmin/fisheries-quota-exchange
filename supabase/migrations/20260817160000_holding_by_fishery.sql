-- Holdings are per fishery. Quantity is kg or units, set on the fishery.

alter table public.fisheries
    add column quantity_type text not null default 'UNITS';

alter table public.fisheries
    add constraint fisheries_quantity_type_check
        check (quantity_type in ('KG', 'UNITS'));

update public.fisheries as fisheries
set quantity_type = 'KG'
where exists (
    select 1
    from public.quota_types as quota_types
    where quota_types.fishery_id = fisheries.id
      and quota_types.measurement_kind = 'WEIGHT'
);

alter table public.quota_holdings
    add column fishery_id bigint references public.fisheries (id) on delete restrict;

update public.quota_holdings as holdings
set fishery_id = stocks.fishery_id
from public.stocks as stocks
where stocks.id = holdings.stock_id;

alter table public.quota_holdings
    alter column fishery_id set not null;

alter table public.quota_holdings
    drop constraint if exists quota_holdings_unique;

alter table public.quota_holdings
    drop column stock_id,
    drop column season_id,
    drop column quota_type_id;

drop function if exists public.create_quota_holding(bigint, bigint, bigint, bigint, numeric, text);

create function public.fishery_unit_label(p_quantity_type text)
returns text
language sql
immutable
as $$
    select case when p_quantity_type = 'KG' then 'kg' else 'units' end
$$;

create function public.create_quota_holding(
    p_organisation_id bigint,
    p_fishery_id bigint,
    p_quantity numeric,
    p_note text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding_id bigint;
    v_role text;
    v_status text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    v_role := public.user_organisation_role(p_organisation_id);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot create a holding for this organisation';
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    if not exists (select 1 from public.fisheries where id = p_fishery_id) then
        raise exception 'Fishery is required';
    end if;

    if exists (
        select 1
        from public.quota_holdings
        where organisation_id = p_organisation_id
          and fishery_id = p_fishery_id
    ) then
        raise exception 'A holding already exists for this fishery. Update the existing holding.';
    end if;

    v_status := public.holding_status_for_actor();

    insert into public.quota_holdings (
        organisation_id,
        fishery_id,
        quantity,
        verification_status,
        verified_at,
        verified_by_email
    )
    values (
        p_organisation_id,
        p_fishery_id,
        p_quantity,
        v_status,
        case when v_status = 'VERIFIED' then now() else null end,
        case when v_status = 'VERIFIED' then public.current_user_email() else null end
    )
    returning id into v_holding_id;

    insert into public.quota_ledger (
        holding_id,
        event_type,
        quantity_delta,
        quantity_after,
        note,
        created_by_email
    )
    values (
        v_holding_id,
        'INITIAL_ALLOCATION',
        p_quantity,
        p_quantity,
        nullif(trim(p_note), ''),
        public.current_user_email()
    );

    return v_holding_id;
end;
$$;

revoke all on function public.create_quota_holding(bigint, bigint, numeric, text) from public;
grant execute on function public.create_quota_holding(bigint, bigint, numeric, text) to authenticated;

create or replace function public.create_listing(
    p_holding_id bigint,
    p_offering text,
    p_quantity numeric,
    p_unit_price_aud numeric,
    p_expires_at timestamptz
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
    v_stock text;
    v_season text;
    v_quota_type text;
    v_kind text;
    v_unit text;
    v_committed numeric;
    v_quantity_type text;
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

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    v_committed := coalesce((
        select sum(r.quantity)
        from public.quota_reservations as r
        where r.holding_id = p_holding_id
          and r.status = 'ACTIVE'
    ), 0) + coalesce((
        select sum(l.quantity)
        from public.listings as l
        where l.holding_id = p_holding_id
          and l.status in ('PENDING_APPROVAL', 'PUBLISHED')
    ), 0);

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
    v_stock := v_unit;
    v_season := v_unit;
    v_quota_type := v_unit;
    v_kind := case when v_quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end;

    insert into public.listings (
        organisation_id,
        holding_id,
        listing_type,
        offering,
        quantity,
        unit_price_aud,
        expires_at,
        status,
        seller_name,
        fishery_name,
        stock_name,
        season_name,
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
        p_unit_price_aud,
        p_expires_at,
        'PENDING_APPROVAL',
        v_seller,
        v_fishery,
        v_stock,
        v_season,
        v_quota_type,
        v_kind,
        v_unit,
        public.current_user_email()
    )
    returning id into v_id;

    return v_id;
end;
$$;

create or replace function public.create_auction(
    p_holding_id bigint,
    p_offering text,
    p_quantity numeric,
    p_starting_price_aud numeric,
    p_bid_increment_aud numeric,
    p_reserve_price_aud numeric,
    p_starts_at timestamptz,
    p_ends_at timestamptz
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
    v_stock text;
    v_season text;
    v_quota_type text;
    v_kind text;
    v_unit text;
    v_committed numeric;
    v_starts timestamptz;
    v_quantity_type text;
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

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    v_committed := coalesce((
        select sum(r.quantity)
        from public.quota_reservations as r
        where r.holding_id = p_holding_id
          and r.status = 'ACTIVE'
    ), 0) + coalesce((
        select sum(l.quantity)
        from public.listings as l
        where l.holding_id = p_holding_id
          and l.status in ('PENDING_APPROVAL', 'PUBLISHED')
    ), 0);

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
    v_stock := v_unit;
    v_season := v_unit;
    v_quota_type := v_unit;
    v_kind := case when v_quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end;

    insert into public.listings (
        organisation_id,
        holding_id,
        listing_type,
        offering,
        quantity,
        unit_price_aud,
        expires_at,
        status,
        seller_name,
        fishery_name,
        stock_name,
        season_name,
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
        p_starting_price_aud,
        p_ends_at,
        'PENDING_APPROVAL',
        v_seller,
        v_fishery,
        v_stock,
        v_season,
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

create or replace function public.simulate_settlement(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
    v_listing public.listings%rowtype;
    v_seller_holding public.quota_holdings%rowtype;
    v_buyer_holding public.quota_holdings%rowtype;
    v_reservation public.quota_reservations%rowtype;
    v_seller_event text;
    v_buyer_event text;
    v_note text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status <> 'AWAITING_SETTLEMENT' then
        raise exception 'Order is not waiting for settlement';
    end if;

    select * into v_listing
    from public.listings
    where id = v_order.listing_id
    for update;

    if v_listing.status <> 'RESERVED' then
        raise exception 'Listing is not reserved';
    end if;

    select * into v_reservation
    from public.quota_reservations
    where order_id = p_order_id
    for update;

    if v_reservation.status <> 'ACTIVE' then
        raise exception 'Quota reservation is not active';
    end if;

    select * into v_seller_holding
    from public.quota_holdings
    where id = v_order.holding_id
    for update;

    if v_order.offering = 'LEASE' then
        v_seller_event := 'LEASE_OUT';
        v_buyer_event := 'LEASE_IN';
    else
        v_seller_event := 'SALE';
        v_buyer_event := 'PURCHASE';
    end if;

    v_note := 'Order ' || p_order_id::text;

    perform public.apply_quota_event(
        v_seller_holding.id,
        v_seller_event,
        -v_order.quantity,
        v_note
    );

    select * into v_buyer_holding
    from public.quota_holdings
    where organisation_id = v_order.buyer_organisation_id
      and fishery_id = v_seller_holding.fishery_id
    for update;

    if not found then
        insert into public.quota_holdings (
            organisation_id,
            fishery_id,
            quantity,
            verification_status,
            verified_at,
            verified_by_email
        )
        values (
            v_order.buyer_organisation_id,
            v_seller_holding.fishery_id,
            0,
            'VERIFIED',
            now(),
            public.current_user_email()
        )
        returning * into v_buyer_holding;
    end if;

    perform public.apply_quota_event(
        v_buyer_holding.id,
        v_buyer_event,
        v_order.quantity,
        v_note
    );

    update public.quota_reservations
    set
        status = 'CONSUMED',
        released_at = now()
    where id = v_reservation.id
      and status = 'ACTIVE';

    update public.listings
    set status = 'SOLD'
    where id = v_listing.id
      and status = 'RESERVED';

    update public.orders
    set status = 'COMPLETED'
    where id = p_order_id;

    update public.transactions
    set
        status = 'COMPLETED',
        completed_at = now()
    where order_id = p_order_id
      and status = 'PENDING';

    perform public.write_audit_event(
        'SETTLEMENT_SIMULATED',
        'order',
        p_order_id,
        jsonb_build_object(
            'seller_holding_id', v_seller_holding.id,
            'buyer_holding_id', v_buyer_holding.id
        )
    );
end;
$$;

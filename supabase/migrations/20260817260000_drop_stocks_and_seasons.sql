-- Stocks and seasons are no longer used. Listings and orders keep fishery
-- snapshots only. Holdings stay per organisation and fishery.

alter table public.listings
    alter column stock_name drop not null,
    alter column season_name drop not null;

alter table public.orders
    alter column stock_name drop not null,
    alter column season_name drop not null;

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

create or replace function public.insert_simulated_order(
    p_listing_id bigint,
    p_buyer_organisation_id bigint,
    p_unit_price_aud numeric
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_listing public.listings%rowtype;
    v_holding public.quota_holdings%rowtype;
    v_buyer_name text;
    v_available numeric;
    v_amount numeric;
    v_order_id bigint;
begin
    select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

    if not found then
        raise exception 'Listing not found';
    end if;

    if v_listing.status <> 'PUBLISHED' then
        raise exception 'Listing is not available';
    end if;

    if p_buyer_organisation_id = v_listing.organisation_id then
        raise exception 'Buyer and seller must be different organisations';
    end if;

    if p_unit_price_aud is null or p_unit_price_aud <= 0 then
        raise exception 'Price must be greater than zero';
    end if;

    select legal_name into v_buyer_name
    from public.organisations
    where id = p_buyer_organisation_id;

    if v_buyer_name is null then
        raise exception 'Organisation not found';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = v_listing.holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_available := v_holding.quantity - coalesce((
        select sum(r.quantity)
        from public.quota_reservations as r
        where r.holding_id = v_holding.id
          and r.status = 'ACTIVE'
    ), 0);

    if v_listing.quantity > v_available then
        raise exception 'Quota is no longer available';
    end if;

    v_amount := round(v_listing.quantity * p_unit_price_aud, 2);

    if v_amount is null or v_amount <= 0 then
        raise exception 'Order amount must be greater than zero';
    end if;

    insert into public.orders (
        listing_id,
        holding_id,
        seller_organisation_id,
        buyer_organisation_id,
        offering,
        quantity,
        unit_price_aud,
        amount_aud,
        status,
        seller_name,
        buyer_name,
        fishery_name,
        quota_type_name,
        measurement_kind,
        unit_label,
        created_by_email
    )
    values (
        v_listing.id,
        v_listing.holding_id,
        v_listing.organisation_id,
        p_buyer_organisation_id,
        v_listing.offering,
        v_listing.quantity,
        p_unit_price_aud,
        v_amount,
        'AWAITING_COMPLIANCE',
        v_listing.seller_name,
        v_buyer_name,
        v_listing.fishery_name,
        v_listing.quota_type_name,
        v_listing.measurement_kind,
        v_listing.unit_label,
        public.current_user_email()
    )
    returning id into v_order_id;

    insert into public.quota_reservations (
        order_id,
        listing_id,
        holding_id,
        quantity,
        status
    )
    values (
        v_order_id,
        v_listing.id,
        v_listing.holding_id,
        v_listing.quantity,
        'ACTIVE'
    );

    insert into public.transactions (
        order_id,
        status,
        amount_aud
    )
    values (
        v_order_id,
        'PENDING',
        v_amount
    );

    update public.listings
    set
        status = 'RESERVED',
        unit_price_aud = p_unit_price_aud
    where id = v_listing.id;

    perform public.write_audit_event(
        'ORDER_CREATED',
        'order',
        v_order_id,
        jsonb_build_object(
            'listing_id', v_listing.id,
            'quantity', v_listing.quantity
        )
    );

    perform public.write_audit_event(
        'QUOTA_RESERVED',
        'order',
        v_order_id,
        jsonb_build_object(
            'holding_id', v_listing.holding_id,
            'quantity', v_listing.quantity
        )
    );

    return v_order_id;
end;
$$;

alter table public.listings
    drop column if exists stock_name,
    drop column if exists season_name;

alter table public.orders
    drop column if exists stock_name,
    drop column if exists season_name;

drop table if exists public.stocks;
drop table if exists public.seasons;

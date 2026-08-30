-- Buying, bidding, paying, and cancelling unpaid orders are Owner and Admin
-- only, matching listings and holdings.

create or replace function public.create_order(
    p_listing_id bigint,
    p_buyer_organisation_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_listing public.listings%rowtype;
    v_role text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    v_role := public.user_organisation_role(p_buyer_organisation_id);

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot purchase for this organisation';
    end if;

    select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

    if not found then
        raise exception 'Listing not found';
    end if;

    if v_listing.listing_type <> 'FIXED_PRICE' then
        raise exception 'This listing is an auction';
    end if;

    if v_listing.status <> 'PUBLISHED' or v_listing.expires_at <= now() then
        raise exception 'Listing is not available to purchase';
    end if;

    return public.insert_simulated_order(
        p_listing_id,
        p_buyer_organisation_id,
        v_listing.unit_price_aud
    );
end;
$$;

create or replace function public.place_bid(
    p_listing_id bigint,
    p_bidder_organisation_id bigint,
    p_amount_aud numeric
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_listing public.listings%rowtype;
    v_bidder_name text;
    v_min numeric;
    v_bid_id bigint;
    v_now timestamptz;
    v_role text;
begin
    v_now := now();

    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    v_role := public.user_organisation_role(p_bidder_organisation_id);

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot bid for this organisation';
    end if;

    select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

    if not found then
        raise exception 'Auction not found';
    end if;

    if v_listing.listing_type <> 'AUCTION' then
        raise exception 'This listing is not an auction';
    end if;

    if v_listing.status <> 'PUBLISHED' then
        raise exception 'Auction is not open for bids';
    end if;

    if v_listing.expires_at <= v_now then
        raise exception 'Auction has ended';
    end if;

    if v_listing.starts_at > v_now then
        raise exception 'Auction has not started';
    end if;

    if p_bidder_organisation_id = v_listing.organisation_id then
        raise exception 'You cannot bid on your organisation''s auction';
    end if;

    if p_amount_aud is null or p_amount_aud <= 0 then
        raise exception 'Bid must be greater than zero';
    end if;

    if exists (select 1 from public.bids where listing_id = p_listing_id) then
        v_min := v_listing.unit_price_aud + v_listing.bid_increment_aud;
    else
        v_min := v_listing.starting_price_aud;
    end if;

    if p_amount_aud < v_min then
        raise exception 'Bid must be at least %', v_min;
    end if;

    select legal_name into v_bidder_name
    from public.organisations
    where id = p_bidder_organisation_id;

    insert into public.bids (
        listing_id,
        organisation_id,
        bidder_name,
        amount_aud
    )
    values (
        p_listing_id,
        p_bidder_organisation_id,
        v_bidder_name,
        p_amount_aud
    )
    returning id into v_bid_id;

    update public.listings
    set unit_price_aud = p_amount_aud
    where id = p_listing_id;

    perform public.write_audit_event(
        'BID_PLACED',
        'listing',
        p_listing_id,
        jsonb_build_object(
            'bid_id', v_bid_id,
            'organisation_id', p_bidder_organisation_id,
            'amount_aud', p_amount_aud
        )
    );

    return v_bid_id;
end;
$$;

create or replace function public.cancel_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
    v_role text;
begin
    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status not in ('AWAITING_COMPLIANCE', 'AWAITING_PAYMENT') then
        raise exception 'Order cannot be cancelled';
    end if;

    if not public.is_platform_admin() then
        v_role := public.user_organisation_role(v_order.buyer_organisation_id);

        if v_role is null or v_role not in ('OWNER', 'ADMIN') then
            raise exception 'You cannot cancel this order';
        end if;
    end if;

    update public.orders
    set status = 'CANCELLED'
    where id = p_order_id;

    perform public.release_order_reservation(p_order_id);

    update public.payments
    set status = 'EXPIRED'
    where order_id = p_order_id
      and status = 'PENDING';

    perform public.write_audit_event(
        'ORDER_CANCELLED',
        'order',
        p_order_id,
        '{}'::jsonb
    );
end;
$$;

create or replace function public.upsert_order_payment(
    p_order_id bigint,
    p_checkout_session_id text,
    p_payment_intent_id text,
    p_amount_aud numeric,
    p_fee_amount_aud numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
    v_role text;
begin
    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status <> 'AWAITING_PAYMENT' then
        raise exception 'Order is not waiting for payment';
    end if;

    v_role := public.user_organisation_role(v_order.buyer_organisation_id);

    if (v_role is null or v_role not in ('OWNER', 'ADMIN'))
       and not public.is_platform_admin() then
        raise exception 'You cannot pay this order';
    end if;

    insert into public.payments (
        order_id,
        checkout_session_id,
        payment_intent_id,
        status,
        amount_aud,
        fee_amount_aud
    )
    values (
        p_order_id,
        nullif(trim(p_checkout_session_id), ''),
        nullif(trim(p_payment_intent_id), ''),
        'PENDING',
        p_amount_aud,
        coalesce(p_fee_amount_aud, 0)
    )
    on conflict (order_id) do update
    set
        checkout_session_id = excluded.checkout_session_id,
        payment_intent_id = coalesce(
            excluded.payment_intent_id,
            public.payments.payment_intent_id
        ),
        status = 'PENDING',
        amount_aud = excluded.amount_aud,
        fee_amount_aud = excluded.fee_amount_aud
    where public.payments.status <> 'PAID';
end;
$$;

notify pgrst, 'reload schema';

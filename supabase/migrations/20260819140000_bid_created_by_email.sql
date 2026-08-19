-- Store who placed each bid so outbid and not-won mail can have a personal copy.

alter table public.bids
    add column created_by_email text;

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
    v_email text;
begin
    v_now := now();
    v_email := public.current_user_email();

    if v_email is null then
        raise exception 'Not authenticated';
    end if;

    if public.user_organisation_role(p_bidder_organisation_id) is null then
        raise exception 'You are not a member of that organisation';
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
        amount_aud,
        created_by_email
    )
    values (
        p_listing_id,
        p_bidder_organisation_id,
        v_bidder_name,
        p_amount_aud,
        v_email
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

notify pgrst, 'reload schema';

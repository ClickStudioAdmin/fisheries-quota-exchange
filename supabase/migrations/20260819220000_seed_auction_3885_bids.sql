-- Development fixture: three valid bids on auction 3885. No-op if that
-- listing is missing, is not a live auction, or this fixture already ran.

do $$
declare
    v_listing_id constant bigint := 3885;
    v_listing public.listings%rowtype;
    v_bidder_ids bigint[];
    v_bidder_names text[];
    v_count int;
    v_i int;
    v_org_id bigint;
    v_org_name text;
    v_amount numeric;
    v_increment numeric;
    v_bid_id bigint;
    v_at timestamptz;
begin
    if exists (
        select 1
        from public.audit_events
        where event_type = 'DEMO_AUCTION_3885_BIDS'
          and entity_id = v_listing_id
    ) then
        return;
    end if;

    select * into v_listing
    from public.listings
    where id = v_listing_id
    for update;

    if not found then
        raise notice 'Listing % not found, skipping bids', v_listing_id;
        return;
    end if;

    if v_listing.listing_type <> 'AUCTION'
       or v_listing.status <> 'PUBLISHED'
       or v_listing.expires_at <= now()
       or v_listing.starts_at > now() then
        raise notice 'Listing % is not a live auction, skipping bids', v_listing_id;
        return;
    end if;

    select
        array_agg(bidders.id order by bidders.sort_key, bidders.id),
        array_agg(bidders.legal_name order by bidders.sort_key, bidders.id)
    into v_bidder_ids, v_bidder_names
    from (
        select
            organisations.id,
            organisations.legal_name,
            case
                when organisations.legal_name ilike 'Test Buyer%' then 0
                when organisations.trading_name = 'FQX seed' then 1
                else 2
            end as sort_key
        from public.organisations
        where organisations.id <> v_listing.organisation_id
          and exists (
              select 1
              from public.organisation_users
              where organisation_users.organisation_id = organisations.id
                and organisation_users.role in ('OWNER', 'ADMIN')
          )
        order by
            case
                when organisations.legal_name ilike 'Test Buyer%' then 0
                when organisations.trading_name = 'FQX seed' then 1
                else 2
            end,
            organisations.id
        limit 3
    ) as bidders;

    v_count := coalesce(array_length(v_bidder_ids, 1), 0);

    if v_count < 1 then
        raise notice 'No other businesses to bid on listing %, skipping', v_listing_id;
        return;
    end if;

    v_increment := v_listing.bid_increment_aud;

    if exists (select 1 from public.bids where listing_id = v_listing_id) then
        v_amount := v_listing.unit_price_aud + v_increment;
    else
        v_amount := v_listing.starting_price_aud;
    end if;

    for v_i in 1..3 loop
        v_org_id := v_bidder_ids[1 + ((v_i - 1) % v_count)];
        v_org_name := v_bidder_names[1 + ((v_i - 1) % v_count)];
        v_at := now() - ((4 - v_i) * interval '45 minutes');

        if v_i = 3
           and v_listing.reserve_price_aud is not null
           and v_amount < v_listing.reserve_price_aud then
            v_amount := v_listing.reserve_price_aud;
        end if;

        insert into public.bids (
            listing_id,
            organisation_id,
            bidder_name,
            amount_aud,
            created_at
        )
        values (
            v_listing_id,
            v_org_id,
            v_org_name,
            v_amount,
            v_at
        )
        returning id into v_bid_id;

        update public.listings
        set unit_price_aud = v_amount
        where id = v_listing_id;

        perform public.write_audit_event(
            'BID_PLACED',
            'listing',
            v_listing_id,
            jsonb_build_object(
                'bid_id', v_bid_id,
                'organisation_id', v_org_id,
                'amount_aud', v_amount
            ),
            v_listing.organisation_id,
            v_org_id
        );

        v_amount := v_amount + v_increment;
    end loop;

    perform public.write_audit_event(
        'DEMO_AUCTION_3885_BIDS',
        'listing',
        v_listing_id,
        jsonb_build_object('listing_id', v_listing_id),
        v_listing.organisation_id
    );
end;
$$;

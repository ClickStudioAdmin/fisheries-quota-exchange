-- Demo in-app inbox rows for the development admin account.
-- Copy matches the first paragraph of each product email.
-- No-op if that person is missing, the notices table is missing, or this
-- fixture already ran.

do $$
declare
    v_email constant text := 'click.studio.admin@gmail.com';
    v_org_id bigint;
    v_org_name text;
    v_holding_id bigint;
    v_holding_fishery text;
    v_listing_id bigint;
    v_listing_type text;
    v_listing_fishery text;
    v_alert_id bigint;
    v_alert_type text;
    v_alert_offering text;
    v_alert_fishery text;
    v_auction_id bigint;
    v_auction_fishery text;
    v_auction_price numeric;
    v_order_id bigint;
    v_order_fishery text;
    v_order_offering text;
    v_order_is_seller boolean;
    v_listing_href text;
    v_alert_href text;
    v_auction_href text;
    v_holding_href text;
    v_order_href text;
    v_payments_href text;
    v_bid_amount text;
    v_alert_type_label text;
    v_alert_offering_label text;
    v_order_offering_label text;
    v_settled_body text;
    v_transfer_title text;
    v_settled_title text;
begin
    if to_regclass('public.user_notifications') is null then
        return;
    end if;

    if exists (
        select 1
        from public.audit_events
        where event_type = 'DEMO_ADMIN_IN_APP_NOTIFICATIONS'
          and payload->>'email' = v_email
    ) then
        return;
    end if;

    if not exists (
        select 1 from public.platform_admins where email = v_email
    ) and not exists (
        select 1 from public.organisation_users where email = v_email
    ) then
        raise notice 'No admin membership for %, skipping in-app backfill', v_email;
        return;
    end if;

    select ou.organisation_id, o.legal_name
    into v_org_id, v_org_name
    from public.organisation_users as ou
    join public.organisations as o on o.id = ou.organisation_id
    where ou.email = v_email
    order by
        case ou.role
            when 'OWNER' then 0
            when 'ADMIN' then 1
            else 2
        end,
        ou.id
    limit 1;

    v_org_name := coalesce(v_org_name, 'your FQX account');
    v_payments_href := case
        when v_org_id is null then '/dashboard/payments'
        else '/dashboard/payments?account=' || v_org_id::text
    end;

    select h.id, f.name
    into v_holding_id, v_holding_fishery
    from public.quota_holdings as h
    join public.fisheries as f on f.id = h.fishery_id
    where v_org_id is not null
      and h.organisation_id = v_org_id
    order by h.id
    limit 1;

    v_holding_href := case
        when v_holding_id is null then '/dashboard/holdings'
        else '/dashboard/holdings/' || v_holding_id::text
    end;
    v_holding_fishery := coalesce(v_holding_fishery, 'Northern Prawn Fishery');

    select l.id, l.listing_type, l.fishery_name
    into v_listing_id, v_listing_type, v_listing_fishery
    from public.listings as l
    where v_org_id is not null
      and l.organisation_id = v_org_id
      and l.listing_type = 'FIXED_PRICE'
    order by l.id desc
    limit 1;

    v_listing_href := case
        when v_listing_id is null then '/dashboard/listings'
        when v_listing_type = 'AUCTION' then '/auctions/' || v_listing_id::text
        else '/marketplace/' || v_listing_id::text
    end;
    v_listing_fishery := coalesce(v_listing_fishery, v_holding_fishery);

    select l.id, l.listing_type, l.offering, l.fishery_name
    into v_alert_id, v_alert_type, v_alert_offering, v_alert_fishery
    from public.listings as l
    where l.status = 'PUBLISHED'
      and (v_org_id is null or l.organisation_id <> v_org_id)
    order by l.id desc
    limit 1;

    if v_alert_id is null then
        select l.id, l.listing_type, l.offering, l.fishery_name
        into v_alert_id, v_alert_type, v_alert_offering, v_alert_fishery
        from public.listings as l
        where l.status = 'PUBLISHED'
        order by l.id desc
        limit 1;
    end if;

    v_alert_href := case
        when v_alert_id is null then v_listing_href
        when v_alert_type = 'AUCTION' then '/auctions/' || v_alert_id::text
        else '/marketplace/' || v_alert_id::text
    end;
    v_alert_fishery := coalesce(v_alert_fishery, v_listing_fishery);
    v_alert_offering_label := case
        when v_alert_offering = 'LEASE' then 'lease'
        else 'sale'
    end;
    v_alert_type_label := case
        when v_alert_type = 'AUCTION' then 'auction'
        else 'fixed price'
    end;

    select l.id, l.fishery_name, l.unit_price_aud
    into v_auction_id, v_auction_fishery, v_auction_price
    from public.listings as l
    where v_org_id is not null
      and l.organisation_id = v_org_id
      and l.listing_type = 'AUCTION'
    order by l.id desc
    limit 1;

    if v_auction_id is null then
        select l.id, l.fishery_name, l.unit_price_aud
        into v_auction_id, v_auction_fishery, v_auction_price
        from public.listings as l
        where l.listing_type = 'AUCTION'
        order by l.id desc
        limit 1;
    end if;

    v_auction_href := case
        when v_auction_id is null then '/dashboard/listings'
        else '/auctions/' || v_auction_id::text
    end;
    v_auction_fishery := coalesce(v_auction_fishery, v_listing_fishery);
    v_bid_amount := '$' || to_char(coalesce(v_auction_price, 19), 'FM999990.00');

    select
        o.id,
        o.fishery_name,
        o.offering,
        (v_org_id is not null and o.seller_organisation_id = v_org_id)
    into
        v_order_id,
        v_order_fishery,
        v_order_offering,
        v_order_is_seller
    from public.orders as o
    where v_org_id is not null
      and (
          o.seller_organisation_id = v_org_id
          or o.buyer_organisation_id = v_org_id
      )
    order by o.id desc
    limit 1;

    v_order_href := case
        when v_order_id is null then '/dashboard/orders'
        else '/orders/' || v_order_id::text
    end;
    v_order_fishery := coalesce(v_order_fishery, v_listing_fishery);
    v_order_offering_label := case
        when v_order_offering = 'LEASE' then 'Lease'
        else 'Sale'
    end;
    v_transfer_title := case
        when v_order_id is null then 'Quota transfer has started'
        else 'Quota transfer has started for FQX order ' || v_order_id::text
    end;
    v_settled_title := case
        when v_order_id is null then 'Order has settled'
        else 'Order ' || v_order_id::text || ' has settled'
    end;
    v_settled_body := case
        when coalesce(v_order_is_seller, true) then
            'Simulated settlement is complete (' || v_order_offering_label
            || '). Dummy tax invoices are attached: quota (seller to buyer) and platform fee (FQX to you).'
        else
            'Simulated settlement is complete (' || v_order_offering_label
            || '). Dummy tax invoices are attached: quota (seller to you) and the platform fee invoice (FQX to the seller).'
    end;

    insert into public.user_notifications (
        email,
        template,
        title,
        body,
        href,
        read_at,
        created_at
    )
    values
        (
            v_email,
            'auction_new_bid',
            'New bid on your auction: ' || v_auction_fishery,
            'A bid of ' || v_bid_amount || ' per unit was placed.',
            v_auction_href,
            null,
            now() - interval '25 minutes'
        ),
        (
            v_email,
            'holding_verified',
            'Holding verified: ' || v_holding_fishery,
            'This holding is verified. You can list quota from it when payments setup is complete.',
            v_holding_href,
            null,
            now() - interval '2 hours'
        ),
        (
            v_email,
            'listing_alert',
            'New ' || v_alert_offering_label || ' listing: ' || v_alert_fishery,
            'A new ' || v_alert_type_label || ' ' || v_alert_offering_label
            || ' listing for ' || v_alert_fishery || ' is on the marketplace.',
            v_alert_href,
            null,
            now() - interval '6 hours'
        ),
        (
            v_email,
            'listing_published',
            'Listing published: ' || v_listing_fishery,
            'Your listing is on the marketplace.',
            v_listing_href,
            null,
            now() - interval '9 hours'
        ),
        (
            v_email,
            'listing_purchased',
            'Your listing was purchased: ' || v_order_fishery,
            'Quota is reserved. The buyer pays FQX next. Settlement follows compliance and transfer.',
            v_order_href,
            null,
            now() - interval '1 day'
        ),
        (
            v_email,
            'payments_setup_complete',
            'Payments setup is complete for ' || v_org_name,
            'This account can receive settlement transfers on FQX. You can list quota for sale or lease when holdings are verified.',
            v_payments_href,
            now() - interval '2 days',
            now() - interval '3 days'
        ),
        (
            v_email,
            'transfer_in_progress',
            v_transfer_title,
            'Compliance passed. FQX is running the authority transfer for this order.',
            v_order_href,
            now() - interval '3 days',
            now() - interval '4 days'
        ),
        (
            v_email,
            'order_settled',
            v_settled_title,
            v_settled_body,
            v_order_href,
            now() - interval '7 days',
            now() - interval '8 days'
        );

    insert into public.audit_events (
        event_type,
        entity_type,
        entity_id,
        actor_email,
        payload
    )
    values (
        'DEMO_ADMIN_IN_APP_NOTIFICATIONS',
        'user',
        0,
        v_email,
        jsonb_build_object('email', v_email, 'count', 8)
    );
end;
$$;

-- Historical listings and orders for Queensland trade-ready businesses so
-- dashboards show every listing status and every order status.

do $$
declare
    v_seller record;
    v_spec record;
    v_email text;
    v_buyer_id bigint;
    v_buyer_name text;
    v_buyer_email text;
    v_org_ids bigint[];
    v_org_count int;
    v_fishery_id bigint;
    v_fishery_name text;
    v_sale_ok boolean;
    v_lease_ok boolean;
    v_kind text;
    v_unit text;
    v_holding_id bigint;
    v_holding_qty numeric;
    v_need numeric;
    v_listing_id bigint;
    v_order_id bigint;
    v_amount numeric;
    v_at timestamptz;
    v_created int := 0;
    v_seller_n int := 0;
begin
    if exists (
        select 1
        from public.audit_events
        where event_type = 'QLD_FORM_FISHERY_STATUS_FIXTURES'
    ) then
        return;
    end if;

    create temporary table qld_status_spec (
        sort_order integer primary key,
        offering text not null,
        listing_type text not null,
        listing_status text not null,
        order_status text,
        payment_status text,
        reservation_status text,
        transfer_status text,
        days_ago integer not null,
        qty numeric not null,
        unused_qty numeric not null,
        used_qty numeric not null,
        price numeric not null,
        review_note text
    ) on commit drop;

    insert into qld_status_spec (
        sort_order, offering, listing_type, listing_status, order_status,
        payment_status, reservation_status, transfer_status,
        days_ago, qty, unused_qty, used_qty, price, review_note
    )
    values
        (1, 'SALE', 'FIXED_PRICE', 'SOLD', 'COMPLETED',
            'PAID', 'CONSUMED', 'APPROVED',
            52, 420, 336, 84, 18.40, null),
        (2, 'LEASE', 'FIXED_PRICE', 'SOLD', 'COMPLETED',
            'PAID', 'CONSUMED', 'APPROVED',
            38, 260, 208, 52, 6.15, null),
        (3, 'SALE', 'FIXED_PRICE', 'CANCELLED', 'CANCELLED',
            'EXPIRED', 'RELEASED', null,
            24, 140, 112, 28, 12.20, 'Checkout expired.'),
        (4, 'LEASE', 'FIXED_PRICE', 'CANCELLED', 'CANCELLED',
            'PAID', 'RELEASED', null,
            16, 110, 88, 22, 7.80, 'Cancelled by admin during compliance.'),
        (5, 'SALE', 'FIXED_PRICE', 'REJECTED', 'REJECTED',
            'PAID', 'RELEASED', null,
            11, 95, 76, 19, 15.60, 'Primary licence does not match this fishery.'),
        (6, 'SALE', 'FIXED_PRICE', 'RESERVED', 'AWAITING_PAYMENT',
            'PENDING', 'ACTIVE', null,
            1, 175, 140, 35, 11.25, null),
        (7, 'SALE', 'FIXED_PRICE', 'RESERVED', 'AWAITING_COMPLIANCE',
            'PAID', 'ACTIVE', null,
            3, 190, 152, 38, 10.40, null),
        (8, 'SALE', 'FIXED_PRICE', 'RESERVED', 'AWAITING_TRANSFER',
            'PAID', 'ACTIVE', 'READY',
            5, 210, 168, 42, 13.75, null),
        (9, 'LEASE', 'FIXED_PRICE', 'RESERVED', 'AWAITING_TRANSFER',
            'PAID', 'ACTIVE', 'READY',
            4, 155, 124, 31, 8.10, null),
        (10, 'SALE', 'FIXED_PRICE', 'RESERVED', 'AWAITING_SETTLEMENT',
            'PAID', 'ACTIVE', 'APPROVED',
            8, 165, 132, 33, 16.90, null),
        (11, 'SALE', 'FIXED_PRICE', 'PENDING_APPROVAL', null,
            null, null, null,
            2, 80, 64, 16, 9.50, null),
        (12, 'LEASE', 'FIXED_PRICE', 'CANCELLED', null,
            null, null, null,
            21, 70, 56, 14, 5.40, 'Withdrawn by seller.'),
        (13, 'SALE', 'FIXED_PRICE', 'REJECTED', null,
            null, null, null,
            14, 60, 48, 12, 8.75, 'Holding documents incomplete.'),
        (14, 'SALE', 'AUCTION', 'UNSOLD', null,
            null, null, null,
            9, 45, 36, 9, 22.00, 'Ended with no bids.');

    select array_agg(organisations.id order by organisations.id)
    into v_org_ids
    from public.organisations
    where public.organisation_is_trade_ready(organisations.id, true);

    v_org_count := coalesce(array_length(v_org_ids, 1), 0);

    if v_org_count = 0 then
        raise notice 'No Queensland trade-ready businesses, skipping status fixtures';
        return;
    end if;

    for v_seller in
        select
            organisations.id,
            organisations.legal_name
        from public.organisations
        where public.organisation_is_trade_ready(organisations.id, true)
          and public.organisation_may_sell(organisations.id)
        order by organisations.id
    loop
        v_seller_n := v_seller_n + 1;

        select organisation_users.email
        into v_email
        from public.organisation_users
        where organisation_users.organisation_id = v_seller.id
        order by
            case organisation_users.role
                when 'OWNER' then 0
                when 'ADMIN' then 1
                else 2
            end,
            organisation_users.id
        limit 1;

        v_email := coalesce(v_email, 'seed.qld@fqx.example');

        v_buyer_id := null;
        v_buyer_name := null;

        if v_org_count >= 2 then
            v_buyer_id := v_org_ids[
                1 + ((v_seller_n) % v_org_count)
            ];
            if v_buyer_id = v_seller.id then
                v_buyer_id := v_org_ids[
                    1 + ((v_seller_n + 1) % v_org_count)
                ];
            end if;
        end if;

        if v_buyer_id is null or v_buyer_id = v_seller.id then
            raise notice 'No Queensland trade-ready counterparty for %, skipping orders',
                v_seller.legal_name;
            v_buyer_id := null;
        end if;

        if v_buyer_id is not null then
            select organisations.legal_name
            into v_buyer_name
            from public.organisations
            where organisations.id = v_buyer_id;

            select organisation_users.email
            into v_buyer_email
            from public.organisation_users
            where organisation_users.organisation_id = v_buyer_id
            order by
                case organisation_users.role
                    when 'OWNER' then 0
                    when 'ADMIN' then 1
                    else 2
                end,
                organisation_users.id
            limit 1;

            v_buyer_email := coalesce(v_buyer_email, v_email);
        end if;

        for v_spec in
            select * from qld_status_spec order by sort_order
        loop
            v_listing_id := null;
            v_order_id := null;

            select
                fisheries.id,
                fisheries.name,
                fisheries.sale_allowed,
                fisheries.lease_allowed,
                holdings.id,
                holdings.quantity
            into
                v_fishery_id,
                v_fishery_name,
                v_sale_ok,
                v_lease_ok,
                v_holding_id,
                v_holding_qty
            from public.quota_holdings as holdings
            join public.fisheries
              on fisheries.id = holdings.fishery_id
            where holdings.organisation_id = v_seller.id
              and holdings.verification_status = 'VERIFIED'
              and (
                  (v_spec.offering = 'SALE' and fisheries.sale_allowed)
                  or (v_spec.offering = 'LEASE' and fisheries.lease_allowed)
              )
            order by holdings.id
            limit 1;

            if v_fishery_id is null then
                select
                    fisheries.id,
                    fisheries.name,
                    fisheries.sale_allowed,
                    fisheries.lease_allowed
                into v_fishery_id, v_fishery_name, v_sale_ok, v_lease_ok
                from public.fisheries
                where (
                    (v_spec.offering = 'SALE' and fisheries.sale_allowed)
                    or (v_spec.offering = 'LEASE' and fisheries.lease_allowed)
                )
                order by fisheries.id
                limit 1;
            end if;

            if v_fishery_id is null then
                continue;
            end if;

            v_unit := 'units';
            v_kind := 'UNITS';
            v_need := v_spec.qty + 500;

            if v_holding_id is null then
                insert into public.quota_holdings (
                    organisation_id,
                    fishery_id,
                    quantity,
                    verification_status,
                    verified_at,
                    verified_by_email
                )
                values (
                    v_seller.id,
                    v_fishery_id,
                    greatest(v_need, 8000),
                    'VERIFIED',
                    now() - (v_spec.days_ago + 10) * interval '1 day',
                    v_email
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
                    greatest(v_need, 8000),
                    greatest(v_need, 8000),
                    'QLD status fixture holding',
                    v_email
                );
            elsif v_spec.reservation_status = 'ACTIVE'
               or v_spec.listing_status in ('PENDING_APPROVAL', 'PUBLISHED') then
                v_holding_qty := coalesce(v_holding_qty, 0);
                if v_holding_qty < v_need + public.holding_committed_quantity(v_holding_id) then
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
                        'ADJUSTMENT',
                        v_need,
                        v_holding_qty + v_need,
                        'Cover QLD status fixture',
                        v_email
                    );

                    update public.quota_holdings
                    set quantity = quantity + v_need
                    where id = v_holding_id;
                end if;
            end if;

            v_at := now() - v_spec.days_ago * interval '1 day';
            v_amount := round(v_spec.qty * v_spec.price, 2);

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
                created_at,
                reviewed_by_email,
                reviewed_at,
                review_note,
                starting_price_aud,
                reserve_price_aud,
                bid_increment_aud,
                starts_at
            )
            values (
                v_seller.id,
                v_holding_id,
                v_spec.listing_type,
                v_spec.offering,
                v_spec.qty,
                v_spec.unused_qty,
                v_spec.used_qty,
                v_spec.price,
                case
                    when v_spec.listing_status = 'UNSOLD' then v_at
                    when v_spec.listing_status in ('SOLD', 'CANCELLED', 'REJECTED')
                        then v_at + interval '12 days'
                    else now() + interval '25 days'
                end,
                v_spec.listing_status,
                v_seller.legal_name,
                v_fishery_name,
                v_unit,
                v_kind,
                v_unit,
                v_email,
                v_at,
                case
                    when v_spec.listing_status = 'PENDING_APPROVAL' then null
                    else v_email
                end,
                case
                    when v_spec.listing_status = 'PENDING_APPROVAL' then null
                    else v_at + interval '6 hours'
                end,
                v_spec.review_note,
                case when v_spec.listing_type = 'AUCTION' then v_spec.price else null end,
                case
                    when v_spec.listing_type = 'AUCTION' then round(v_spec.price * 1.2, 2)
                    else null
                end,
                case when v_spec.listing_type = 'AUCTION' then 1.00 else null end,
                case
                    when v_spec.listing_type = 'AUCTION' then v_at - interval '8 days'
                    else null
                end
            )
            returning id into v_listing_id;

            v_created := v_created + 1;

            if v_spec.order_status is null or v_buyer_id is null then
                continue;
            end if;

            insert into public.orders (
                listing_id,
                holding_id,
                seller_organisation_id,
                buyer_organisation_id,
                offering,
                quantity,
                unused_quantity,
                used_quantity,
                unit_price_aud,
                amount_aud,
                status,
                seller_name,
                buyer_name,
                fishery_name,
                quota_type_name,
                measurement_kind,
                unit_label,
                created_by_email,
                created_at,
                review_note
            )
            values (
                v_listing_id,
                v_holding_id,
                v_seller.id,
                v_buyer_id,
                v_spec.offering,
                v_spec.qty,
                v_spec.unused_qty,
                v_spec.used_qty,
                v_spec.price,
                v_amount,
                v_spec.order_status,
                v_seller.legal_name,
                v_buyer_name,
                v_fishery_name,
                v_unit,
                v_kind,
                v_unit,
                v_buyer_email,
                v_at + interval '1 day',
                v_spec.review_note
            )
            returning id into v_order_id;

            insert into public.quota_reservations (
                order_id,
                listing_id,
                holding_id,
                quantity,
                status,
                created_at,
                released_at
            )
            values (
                v_order_id,
                v_listing_id,
                v_holding_id,
                v_spec.qty,
                v_spec.reservation_status,
                v_at + interval '1 day',
                case
                    when v_spec.reservation_status in ('RELEASED', 'CONSUMED')
                        then v_at + interval '2 days'
                    else null
                end
            );

            if v_spec.payment_status is not null then
                insert into public.payments (
                    order_id,
                    status,
                    amount_aud,
                    created_at
                )
                values (
                    v_order_id,
                    v_spec.payment_status,
                    v_amount,
                    v_at + interval '1 day'
                );
            end if;

            if v_spec.order_status in ('COMPLETED', 'AWAITING_SETTLEMENT') then
                insert into public.transactions (
                    order_id,
                    status,
                    amount_aud,
                    created_at,
                    completed_at
                )
                values (
                    v_order_id,
                    case
                        when v_spec.order_status = 'COMPLETED' then 'COMPLETED'
                        else 'PENDING'
                    end,
                    v_amount,
                    v_at + interval '2 days',
                    case
                        when v_spec.order_status = 'COMPLETED'
                            then v_at + interval '4 days'
                        else null
                    end
                );
            end if;

            if v_spec.transfer_status is not null then
                insert into public.transfer_applications (
                    order_id,
                    process_code,
                    form_type,
                    form_version,
                    status,
                    submitted_at,
                    notes
                )
                values (
                    v_order_id,
                    case
                        when v_spec.offering = 'LEASE' then 'QLD_LEASE'
                        else 'QLD_SALE'
                    end,
                    case
                        when v_spec.offering = 'LEASE' then 'FDU1469'
                        else 'FDU1465'
                    end,
                    case
                        when v_spec.offering = 'LEASE' then 'V02/26'
                        else 'V09/23'
                    end,
                    v_spec.transfer_status,
                    case
                        when v_spec.transfer_status in (
                            'SUBMITTED', 'PROCESSING', 'APPROVED'
                        ) then v_at + interval '3 days'
                        else null
                    end,
                    'QLD status fixture'
                );
            end if;
        end loop;
    end loop;

    perform public.write_audit_event(
        'QLD_FORM_FISHERY_STATUS_FIXTURES',
        'platform',
        0,
        jsonb_build_object('listings_created', v_created),
        null
    );
end;
$$;

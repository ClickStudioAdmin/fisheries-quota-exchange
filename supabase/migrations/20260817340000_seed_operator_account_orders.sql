-- Demo buy and sell orders for the development operator account.
-- No-op if that person has no membership, the seed catalogue is missing,
-- or this fixture already ran.

do $$
declare
    v_email constant text := 'timg_81@live.com';
    v_org_id bigint;
    v_org_name text;
    v_counter_ids bigint[];
    v_counter_names text[];
    v_counter_emails text[];
    v_counter_count int;
    v_counter_idx int;
    v_seller_id bigint;
    v_seller_name text;
    v_buyer_id bigint;
    v_buyer_name text;
    v_seller_email text;
    v_holding_org bigint;
    v_holding_id bigint;
    v_listing_id bigint;
    v_order_id bigint;
    v_fishery_id bigint;
    v_fishery_name text;
    v_kind text;
    v_unit text;
    v_amount numeric;
    v_holding_qty numeric;
    v_reserved numeric;
    v_extra numeric;
    v_at timestamptz;
    v_listing_status text;
    v_reservation_status text;
    v_created int := 0;
    v_spec record;
begin
    if exists (
        select 1
        from public.audit_events
        where event_type = 'DEMO_OPERATOR_ORDERS'
          and payload->>'email' = v_email
    ) then
        return;
    end if;

    if not exists (
        select 1
        from public.organisations
        where trading_name = 'FQX seed'
    ) then
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

    if v_org_id is null then
        raise notice 'No organisation for %, skipping operator order fixture', v_email;
        return;
    end if;

    select
        array_agg(o.id order by o.id),
        array_agg(o.legal_name order by o.id),
        array_agg(ou.email order by o.id)
    into v_counter_ids, v_counter_names, v_counter_emails
    from public.organisations as o
    join public.organisation_users as ou
      on ou.organisation_id = o.id
     and ou.role = 'OWNER'
    where o.trading_name = 'FQX seed'
      and o.id <> v_org_id;

    v_counter_count := coalesce(array_length(v_counter_ids, 1), 0);

    if v_counter_count < 1 then
        raise notice 'No seed counterparties, skipping operator order fixture';
        return;
    end if;

    create temporary table demo_operator_order (
        side text not null,
        offering text not null,
        status text not null,
        fishery_name text not null,
        qty numeric not null,
        price numeric not null,
        days_ago int not null,
        counter_offset int not null
    ) on commit drop;

    insert into demo_operator_order (
        side, offering, status, fishery_name, qty, price, days_ago, counter_offset
    )
    values
        ('SELL', 'SALE', 'COMPLETED', 'Southern Bluefin Tuna Fishery', 120, 31.50, 40, 0),
        ('SELL', 'LEASE', 'COMPLETED', 'NSW Lobster Fishery', 8, 295.00, 25, 1),
        ('SELL', 'SALE', 'AWAITING_COMPLIANCE', 'Northern Prawn Fishery', 75, 19.40, 2, 0),
        ('SELL', 'SALE', 'AWAITING_SETTLEMENT', 'Victorian Rock Lobster Fishery', 12, 310.00, 6, 1),
        ('BUY', 'SALE', 'COMPLETED', 'Heard Island Toothfish Fishery', 40, 44.80, 18, 0),
        ('BUY', 'LEASE', 'COMPLETED', 'Tasmanian Abalone Fishery', 55, 22.10, 12, 1),
        ('BUY', 'SALE', 'AWAITING_TRANSFER', 'Eastern Tuna and Billfish Fishery', 90, 13.20, 4, 0),
        ('BUY', 'SALE', 'COMPLETED', 'WA Rock Lobster Fishery', 6, 435.00, 9, 1);

    for v_spec in
        select *
        from demo_operator_order
        order by days_ago desc
    loop
        v_fishery_id := null;
        v_holding_id := null;
        v_listing_id := null;
        v_order_id := null;

        select
            f.id,
            f.name,
            case when f.quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end,
            public.fishery_unit_label(f.quantity_type)
        into v_fishery_id, v_fishery_name, v_kind, v_unit
        from public.fisheries as f
        where f.name = v_spec.fishery_name;

        if v_fishery_id is null then
            continue;
        end if;

        v_counter_idx := 1 + (v_spec.counter_offset % v_counter_count);

        if v_spec.side = 'SELL' then
            v_seller_id := v_org_id;
            v_seller_name := v_org_name;
            v_seller_email := v_email;
            v_buyer_id := v_counter_ids[v_counter_idx];
            v_buyer_name := v_counter_names[v_counter_idx];
        else
            v_seller_id := v_counter_ids[v_counter_idx];
            v_seller_name := v_counter_names[v_counter_idx];
            v_seller_email := v_counter_emails[v_counter_idx];
            v_buyer_id := v_org_id;
            v_buyer_name := v_org_name;
        end if;

        v_holding_org := v_seller_id;

        select h.id
        into v_holding_id
        from public.quota_holdings as h
        where h.organisation_id = v_holding_org
          and h.fishery_id = v_fishery_id
        order by h.id
        limit 1;

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
                v_holding_org,
                v_fishery_id,
                50000,
                'VERIFIED',
                now() - (v_spec.days_ago + 20) * interval '1 day',
                v_email
            )
            returning id into v_holding_id;

            insert into public.quota_ledger (
                holding_id,
                event_type,
                quantity_delta,
                quantity_after,
                note,
                created_by_email,
                created_at
            )
            values (
                v_holding_id,
                'INITIAL_ALLOCATION',
                50000,
                50000,
                'Demo holding for operator orders',
                v_email,
                now() - (v_spec.days_ago + 20) * interval '1 day'
            );
        elsif v_spec.status not in ('COMPLETED', 'REJECTED', 'CANCELLED') then
            select h.quantity
            into v_holding_qty
            from public.quota_holdings as h
            where h.id = v_holding_id;

            v_reserved := public.holding_committed_quantity(v_holding_id);
            v_extra := v_spec.qty - (v_holding_qty - v_reserved);

            if v_extra > 0 then
                update public.quota_holdings
                set quantity = quantity + v_extra
                where id = v_holding_id;

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
                    v_extra,
                    v_holding_qty + v_extra,
                    'Cover demo reserved listing',
                    v_email
                );
            end if;
        end if;

        v_at := now() - v_spec.days_ago * interval '1 day';
        v_amount := round(v_spec.qty * v_spec.price, 2);
        v_listing_status := case
            when v_spec.status = 'COMPLETED' then 'SOLD'
            else 'RESERVED'
        end;
        v_reservation_status := case
            when v_spec.status = 'COMPLETED' then 'CONSUMED'
            else 'ACTIVE'
        end;

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
            created_at,
            reviewed_by_email,
            reviewed_at
        )
        values (
            v_seller_id,
            v_holding_id,
            'FIXED_PRICE',
            v_spec.offering,
            v_spec.qty,
            v_spec.price,
            v_at + interval '30 days',
            v_listing_status,
            v_seller_name,
            v_fishery_name,
            v_unit,
            v_kind,
            v_unit,
            v_seller_email,
            v_at,
            'seed.market@fqx.example',
            v_at + interval '6 hours'
        )
        returning id into v_listing_id;

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
            created_by_email,
            created_at
        )
        values (
            v_listing_id,
            v_holding_id,
            v_seller_id,
            v_buyer_id,
            v_spec.offering,
            v_spec.qty,
            v_spec.price,
            v_amount,
            v_spec.status,
            v_seller_name,
            v_buyer_name,
            v_fishery_name,
            v_unit,
            v_kind,
            v_unit,
            v_email,
            v_at + interval '1 day'
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
            v_reservation_status,
            v_at + interval '1 day',
            case
                when v_reservation_status = 'CONSUMED'
                    then v_at + interval '3 days'
                else null
            end
        );

        insert into public.transactions (
            order_id,
            status,
            amount_aud,
            created_at,
            completed_at
        )
        values (
            v_order_id,
            case when v_spec.status = 'COMPLETED' then 'COMPLETED' else 'PENDING' end,
            v_amount,
            v_at + interval '1 day',
            case
                when v_spec.status = 'COMPLETED' then v_at + interval '3 days'
                else null
            end
        );

        v_created := v_created + 1;
    end loop;

    if v_created = 0 then
        return;
    end if;

    insert into public.audit_events (
        event_type,
        entity_type,
        entity_id,
        actor_email,
        payload
    )
    values (
        'DEMO_OPERATOR_ORDERS',
        'organisation',
        v_org_id,
        v_email,
        jsonb_build_object('email', v_email, 'order_count', v_created)
    );
end;
$$;

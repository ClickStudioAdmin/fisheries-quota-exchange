-- One open sell order for click.studio.admin@gmail.com so settlement
-- simulation (and the dummy tax invoice email) can be tested.
-- No-op if that person has no membership, the seed catalogue is missing,
-- or this fixture already ran.

do $$
declare
    v_email constant text := 'click.studio.admin@gmail.com';
    v_qty constant numeric := 40;
    v_price constant numeric := 18.75;
    v_org_id bigint;
    v_org_name text;
    v_buyer_id bigint;
    v_buyer_name text;
    v_fishery_id bigint;
    v_fishery_name text;
    v_kind text;
    v_unit text;
    v_holding_id bigint;
    v_holding_qty numeric;
    v_reserved numeric;
    v_extra numeric;
    v_listing_id bigint;
    v_order_id bigint;
    v_amount numeric;
    v_at timestamptz := now() - interval '2 days';
begin
    if exists (
        select 1
        from public.audit_events
        where event_type = 'DEMO_ADMIN_SELLER_TEST_ORDER'
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
        raise notice 'No organisation for %, skipping seller test order', v_email;
        return;
    end if;

    select o.id, o.legal_name
    into v_buyer_id, v_buyer_name
    from public.organisations as o
    join public.organisation_users as ou
      on ou.organisation_id = o.id
     and ou.role = 'OWNER'
    where o.trading_name = 'FQX seed'
      and o.id <> v_org_id
    order by o.id
    limit 1;

    if v_buyer_id is null then
        raise notice 'No seed buyer, skipping seller test order';
        return;
    end if;

    select
        f.id,
        f.name,
        case when f.quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end,
        public.fishery_unit_label(f.quantity_type)
    into v_fishery_id, v_fishery_name, v_kind, v_unit
    from public.fisheries as f
    where f.name = 'Northern Prawn Fishery';

    if v_fishery_id is null then
        raise notice 'Northern Prawn Fishery missing, skipping seller test order';
        return;
    end if;

    select h.id
    into v_holding_id
    from public.quota_holdings as h
    where h.organisation_id = v_org_id
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
            v_org_id,
            v_fishery_id,
            50000,
            'VERIFIED',
            v_at - interval '20 days',
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
            'Demo holding for admin seller test order',
            v_email,
            v_at - interval '20 days'
        );
    else
        select h.quantity
        into v_holding_qty
        from public.quota_holdings as h
        where h.id = v_holding_id;

        v_reserved := public.holding_committed_quantity(v_holding_id);
        v_extra := v_qty - (v_holding_qty - v_reserved);

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
                'Cover admin seller test order',
                v_email
            );
        end if;
    end if;

    v_amount := round(v_qty * v_price, 2);

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
        v_org_id,
        v_holding_id,
        'FIXED_PRICE',
        'SALE',
        v_qty,
        v_price,
        v_at + interval '30 days',
        'RESERVED',
        v_org_name,
        v_fishery_name,
        v_unit,
        v_kind,
        v_unit,
        v_email,
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
        v_org_id,
        v_buyer_id,
        'SALE',
        v_qty,
        v_price,
        v_amount,
        'AWAITING_SETTLEMENT',
        v_org_name,
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
        created_at
    )
    values (
        v_order_id,
        v_listing_id,
        v_holding_id,
        v_qty,
        'ACTIVE',
        v_at + interval '1 day'
    );

    insert into public.transactions (
        order_id,
        status,
        amount_aud,
        created_at
    )
    values (
        v_order_id,
        'PENDING',
        v_amount,
        v_at + interval '1 day'
    );

    insert into public.audit_events (
        event_type,
        entity_type,
        entity_id,
        actor_email,
        payload
    )
    values (
        'DEMO_ADMIN_SELLER_TEST_ORDER',
        'order',
        v_order_id,
        v_email,
        jsonb_build_object('email', v_email, 'order_id', v_order_id)
    );
end;
$$;

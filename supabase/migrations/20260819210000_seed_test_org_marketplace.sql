-- Development marketplace for Test Org: sale and lease, fixed price and
-- auction. Adds verified holdings (or tops them up) when needed. No-op if
-- Test Org is missing, cannot sell, or this fixture already ran.

do $$
declare
    v_org_id bigint;
    v_org_name text;
    v_email text;
    v_spec record;
    v_fishery_id bigint;
    v_fishery_name text;
    v_quantity_type text;
    v_unit text;
    v_kind text;
    v_holding_id bigint;
    v_holding_qty numeric;
    v_committed numeric;
    v_need numeric;
    v_extra numeric;
    v_target numeric;
    v_created int := 0;
    v_start timestamptz := now() - interval '2 hours';
begin
    if exists (
        select 1
        from public.audit_events
        where event_type = 'DEMO_TEST_ORG_MARKETPLACE'
    ) then
        return;
    end if;

    select organisations.id, organisations.legal_name
    into v_org_id, v_org_name
    from public.organisations
    where trim(organisations.legal_name) ilike 'Test Org'
       or trim(coalesce(organisations.trading_name, '')) ilike 'Test Org'
    order by organisations.id
    limit 1;

    if v_org_id is null then
        raise notice 'Test Org not found, skipping marketplace fixture';
        return;
    end if;

    if not public.organisation_may_sell(v_org_id) then
        raise notice 'Test Org cannot accept charges, skipping marketplace fixture';
        return;
    end if;

    select organisation_users.email
    into v_email
    from public.organisation_users
    where organisation_users.organisation_id = v_org_id
    order by
        case organisation_users.role
            when 'OWNER' then 0
            when 'ADMIN' then 1
            else 2
        end,
        organisation_users.id
    limit 1;

    v_email := coalesce(v_email, 'seed.market@fqx.example');

    create temporary table test_org_listing_spec (
        sort_order integer primary key,
        jurisdiction_code text not null,
        fishery_match text not null,
        listing_type text not null,
        offering text not null,
        quantity numeric not null,
        unit_price_aud numeric not null,
        starting_price_aud numeric,
        reserve_price_aud numeric,
        bid_increment_aud numeric,
        expires_days integer not null
    ) on commit drop;

    insert into test_org_listing_spec (
        sort_order,
        jurisdiction_code,
        fishery_match,
        listing_type,
        offering,
        quantity,
        unit_price_aud,
        starting_price_aud,
        reserve_price_aud,
        bid_increment_aud,
        expires_days
    )
    values
        (1, 'CTH', 'Southern Bluefin Tuna', 'FIXED_PRICE', 'SALE',
            200, 34.50, null, null, null, 45),
        (2, 'CTH', 'Northern Prawn', 'FIXED_PRICE', 'SALE',
            500, 19.80, null, null, null, 40),
        (3, 'CTH', 'Heard Island Toothfish', 'AUCTION', 'SALE',
            60, 38.00, 38.00, 45.00, 1.00, 14),
        (4, 'CTH', 'Eastern Tuna and Billfish', 'AUCTION', 'SALE',
            300, 11.00, 11.00, 14.00, 0.50, 12),
        (5, 'SA', 'Sardine', 'FIXED_PRICE', 'LEASE',
            1500, 0.55, null, null, null, 60),
        (6, 'NSW', 'Abalone', 'FIXED_PRICE', 'LEASE',
            25, 42.00, null, null, null, 50),
        (7, 'NSW', 'Lobster', 'AUCTION', 'LEASE',
            10, 80.00, 80.00, 100.00, 5.00, 16),
        (8, 'VIC', 'Rock Lobster', 'AUCTION', 'LEASE',
            6, 70.00, 70.00, 90.00, 5.00, 18);

    for v_spec in
        select *
        from test_org_listing_spec
        order by sort_order
    loop
        select
            fisheries.id,
            fisheries.name,
            fisheries.quantity_type
        into v_fishery_id, v_fishery_name, v_quantity_type
        from public.fisheries
        join public.jurisdictions
          on jurisdictions.id = fisheries.jurisdiction_id
        where jurisdictions.code = v_spec.jurisdiction_code
          and fisheries.name ilike '%' || v_spec.fishery_match || '%'
        order by fisheries.id
        limit 1;

        if v_fishery_id is null then
            raise notice 'Fishery % / % missing, skipping listing',
                v_spec.jurisdiction_code, v_spec.fishery_match;
            continue;
        end if;

        v_unit := public.fishery_unit_label(v_quantity_type);
        v_kind := case when v_quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end;

        select holdings.id
        into v_holding_id
        from public.quota_holdings as holdings
        where holdings.organisation_id = v_org_id
          and holdings.fishery_id = v_fishery_id
        order by holdings.id
        limit 1;

        v_need := v_spec.quantity;
        v_target := greatest(
            v_need * 10,
            case when v_quantity_type = 'KG' then 5000 else 80 end
        );

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
                v_target,
                'VERIFIED',
                now() - interval '10 days',
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
                v_target,
                v_target,
                'Test Org marketplace holding',
                v_email
            );
        else
            update public.quota_holdings
            set
                verification_status = 'VERIFIED',
                verified_at = coalesce(verified_at, now() - interval '10 days'),
                verified_by_email = coalesce(verified_by_email, v_email)
            where id = v_holding_id
              and verification_status is distinct from 'VERIFIED';

            select holdings.quantity
            into v_holding_qty
            from public.quota_holdings as holdings
            where holdings.id = v_holding_id;

            v_committed := public.holding_committed_quantity(v_holding_id);
            v_extra := (v_committed + v_need) - v_holding_qty;

            if v_holding_qty < v_target then
                v_extra := greatest(v_extra, v_target - v_holding_qty);
            end if;

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
                    'Cover Test Org marketplace listing',
                    v_email
                );
            end if;
        end if;

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
            reviewed_at,
            review_note,
            starting_price_aud,
            reserve_price_aud,
            bid_increment_aud,
            starts_at
        )
        values (
            v_org_id,
            v_holding_id,
            v_spec.listing_type,
            v_spec.offering,
            v_spec.quantity,
            v_spec.unit_price_aud,
            now() + (v_spec.expires_days * interval '1 day'),
            'PUBLISHED',
            v_org_name,
            v_fishery_name,
            v_unit,
            v_kind,
            v_unit,
            v_email,
            v_start,
            v_email,
            v_start,
            'Test Org marketplace fixture',
            v_spec.starting_price_aud,
            v_spec.reserve_price_aud,
            v_spec.bid_increment_aud,
            case
                when v_spec.listing_type = 'AUCTION' then v_start
                else null
            end
        );

        v_created := v_created + 1;
    end loop;

    if v_created = 0 then
        raise notice 'No Test Org listings created';
        return;
    end if;

    perform public.write_audit_event(
        'DEMO_TEST_ORG_MARKETPLACE',
        'organisation',
        v_org_id,
        jsonb_build_object('listings_created', v_created),
        v_org_id
    );
end;
$$;

-- One live lease auction for marketplace testing. No-op if a published
-- lease auction already exists, or if no verified holding has spare quantity.

do $$
declare
    v_holding public.quota_holdings%rowtype;
    v_available numeric;
    v_qty numeric;
    v_org_name text;
    v_email text;
    v_fishery text;
    v_quantity_type text;
    v_unit text;
    v_kind text;
    v_start timestamptz := now() - interval '1 hour';
    v_end timestamptz := now() + interval '14 days';
    v_start_price numeric := 8.00;
    v_increment numeric := 0.50;
    v_reserve numeric := 12.00;
begin
    if exists (
        select 1
        from public.listings
        where listing_type = 'AUCTION'
          and offering = 'LEASE'
          and status = 'PUBLISHED'
          and expires_at > now()
    ) then
        return;
    end if;

    select holdings.*
    into v_holding
    from public.quota_holdings as holdings
    join public.organisations as organisations
      on organisations.id = holdings.organisation_id
    where holdings.verification_status = 'VERIFIED'
      and holdings.quantity - public.holding_committed_quantity(holdings.id) >= 10
    order by
        case when organisations.trading_name = 'FQX seed' then 0 else 1 end,
        holdings.quantity - public.holding_committed_quantity(holdings.id) desc,
        holdings.id
    limit 1;

    if v_holding.id is null then
        raise notice 'No verified holding with spare quota, skipping lease auction';
        return;
    end if;

    v_available := v_holding.quantity - public.holding_committed_quantity(v_holding.id);
    v_qty := least(50, trunc(v_available));

    if v_qty < 10 then
        raise notice 'Spare quantity too small, skipping lease auction';
        return;
    end if;

    select legal_name into v_org_name
    from public.organisations
    where id = v_holding.organisation_id;

    select email
    into v_email
    from public.organisation_users
    where organisation_id = v_holding.organisation_id
    order by
        case role
            when 'OWNER' then 0
            when 'ADMIN' then 1
            else 2
        end,
        id
    limit 1;

    v_email := coalesce(v_email, 'seed.market@fqx.example');

    select
        fisheries.name,
        fisheries.quantity_type
    into v_fishery, v_quantity_type
    from public.fisheries as fisheries
    where fisheries.id = v_holding.fishery_id;

    v_unit := public.fishery_unit_label(v_quantity_type);
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
        v_holding.organisation_id,
        v_holding.id,
        'AUCTION',
        'LEASE',
        v_qty,
        v_start_price,
        v_end,
        'PUBLISHED',
        v_org_name,
        v_fishery,
        v_unit,
        v_kind,
        v_unit,
        v_email,
        v_start,
        'seed.market@fqx.example',
        v_start,
        'Demo lease auction',
        v_start_price,
        v_reserve,
        v_increment,
        v_start
    );
end;
$$;

-- Development catalogue: real Australian fisheries, organisations, users,
-- holdings, live listings, and historical trades so every public and admin
-- surface has data. Not official regulatory records.

do $$
declare
    v_fishery record;
    v_org_ids bigint[];
    v_org_names text[];
    v_org_emails text[];
    v_org_count int;
    v_seller_idx int;
    v_buyer_idx int;
    v_holding_id bigint;
    v_buyer_holding_id bigint;
    v_listing_id bigint;
    v_order_id bigint;
    v_stock text;
    v_season text;
    v_quota text;
    v_kind text;
    v_unit text;
    v_price numeric;
    v_qty numeric;
    v_amount numeric;
    v_at timestamptz;
    v_base numeric;
    v_n int;
    v_offering text;
    v_status text;
    v_start timestamptz;
    v_end timestamptz;
begin
    if exists (
        select 1
        from public.organisations
        where trading_name = 'FQX seed'
    ) then
        return;
    end if;

    create temporary table seed_fishery (
        jurisdiction_code text not null,
        name text not null,
        code text not null,
        quantity_type text not null,
        base_price numeric not null
    ) on commit drop;

    insert into seed_fishery (
        jurisdiction_code, name, code, quantity_type, base_price
    )
    values
        ('CTH', 'Southern Bluefin Tuna Fishery', 'SBT', 'KG', 28.50),
        ('CTH', 'Northern Prawn Fishery', 'NPF', 'KG', 18.20),
        ('CTH', 'Heard Island Toothfish Fishery', 'HIMI', 'KG', 42.00),
        ('CTH', 'Eastern Tuna and Billfish Fishery', 'ETBF', 'KG', 12.40),
        ('CTH', 'Western Tuna and Billfish Fishery', 'WTBF', 'KG', 11.80),
        ('CTH', 'Bass Strait Central Zone Scallop Fishery', 'BSCZSF', 'KG', 8.60),
        ('CTH', 'Southern and Eastern Scalefish and Shark Fishery', 'SESSF', 'KG', 6.40),
        ('CTH', 'Small Pelagic Fishery', 'SPF', 'KG', 1.85),
        ('CTH', 'Macquarie Island Toothfish Fishery', 'MITF', 'KG', 38.00),
        ('CTH', 'Coral Sea Fishery', 'CSF', 'KG', 9.20),
        ('CTH', 'North West Slope Trawl Fishery', 'NWSTF', 'KG', 7.50),
        ('CTH', 'Western Deepwater Trawl Fishery', 'WDTF', 'KG', 6.80),
        ('CTH', 'Southern Squid Jig Fishery', 'SSJF', 'KG', 4.20),
        ('CTH', 'Skipjack Tuna Fishery', 'SJTF', 'KG', 3.10),
        ('CTH', 'Great Australian Bight Trawl Fishery', 'GABTF', 'KG', 5.90),
        ('NSW', 'NSW Ocean Trawl Fishery', 'NSW-OT', 'KG', 7.80),
        ('NSW', 'NSW Ocean Trap and Line Fishery', 'NSW-OTL', 'KG', 9.40),
        ('NSW', 'NSW Estuary General Fishery', 'NSW-EG', 'KG', 6.20),
        ('NSW', 'NSW Abalone Fishery', 'NSW-AB', 'KG', 85.00),
        ('NSW', 'NSW Lobster Fishery', 'NSW-LOB', 'UNITS', 320.00),
        ('NSW', 'NSW Ocean Hauling Fishery', 'NSW-OH', 'KG', 4.50),
        ('NSW', 'NSW Estuary Prawn Trawl Fishery', 'NSW-EPT', 'KG', 14.00),
        ('NSW', 'NSW Sea Urchin and Turban Shell Fishery', 'NSW-SUTS', 'KG', 12.50),
        ('VIC', 'Victorian Rock Lobster Fishery', 'VIC-RL', 'UNITS', 280.00),
        ('VIC', 'Victorian Abalone Fishery', 'VIC-AB', 'KG', 78.00),
        ('VIC', 'Victorian Giant Crab Fishery', 'VIC-GC', 'KG', 45.00),
        ('VIC', 'Victorian Scallop Fishery', 'VIC-SC', 'KG', 8.20),
        ('VIC', 'Victorian Eel Fishery', 'VIC-EEL', 'KG', 11.00),
        ('VIC', 'Victorian Ocean Purse Seine Fishery', 'VIC-OPS', 'KG', 2.40),
        ('VIC', 'Victorian Corner Inlet Fishery', 'VIC-CI', 'KG', 6.80),
        ('QLD', 'QLD East Coast Otter Trawl', 'QLD-ECOT', 'KG', 16.50),
        ('QLD', 'QLD Coral Reef Fin Fish Fishery', 'QLD-CRFFF', 'KG', 22.00),
        ('QLD', 'QLD East Coast Spanish Mackerel Fishery', 'QLD-ECSM', 'KG', 15.80),
        ('QLD', 'QLD Spanner Crab Fishery', 'QLD-SPCR', 'KG', 18.40),
        ('QLD', 'QLD Mud Crab Fishery', 'QLD-MCR', 'KG', 24.00),
        ('QLD', 'QLD East Coast Inshore Fin Fish Fishery', 'QLD-ECIFF', 'KG', 8.90),
        ('QLD', 'QLD Rocky Reef Fin Fish Fishery', 'QLD-RRFF', 'KG', 11.20),
        ('QLD', 'QLD Sea Cucumber Fishery', 'QLD-SCUC', 'KG', 19.00),
        ('QLD', 'QLD Marine Aquarium Fish Fishery', 'QLD-MAF', 'UNITS', 35.00),
        ('QLD', 'QLD Trochus Fishery', 'QLD-TRO', 'KG', 7.40),
        ('SA', 'SA Abalone Fishery', 'SA-AB', 'KG', 92.00),
        ('SA', 'SA Southern Zone Rock Lobster Fishery', 'SA-SZRL', 'UNITS', 340.00),
        ('SA', 'SA Northern Zone Rock Lobster Fishery', 'SA-NZRL', 'UNITS', 310.00),
        ('SA', 'SA Sardine Fishery', 'SA-SAR', 'KG', 1.45),
        ('SA', 'SA Pipi Fishery', 'SA-PIPI', 'KG', 9.80),
        ('SA', 'SA Blue Crab Fishery', 'SA-BCR', 'KG', 16.20),
        ('SA', 'SA Giant Crab Fishery', 'SA-GC', 'KG', 41.00),
        ('SA', 'SA Marine Scalefish Fishery', 'SA-MSF', 'KG', 7.60),
        ('SA', 'SA Lakes and Coorong Fishery', 'SA-LCF', 'KG', 5.40),
        ('WA', 'WA Rock Lobster Fishery', 'WA-WRL', 'UNITS', 420.00),
        ('WA', 'WA Abalone Fishery', 'WA-AB', 'KG', 88.00),
        ('WA', 'WA Pearl Oyster Fishery', 'WA-PO', 'UNITS', 95.00),
        ('WA', 'WA Exmouth Gulf Prawn Fishery', 'WA-EGP', 'KG', 17.20),
        ('WA', 'WA Shark Bay Prawn Fishery', 'WA-SBP', 'KG', 16.80),
        ('WA', 'WA Shark Bay Scallop Fishery', 'WA-SBS', 'KG', 9.10),
        ('WA', 'WA West Coast Demersal Scalefish Fishery', 'WA-WCD', 'KG', 10.40),
        ('WA', 'WA Kimberley Prawn Fishery', 'WA-KP', 'KG', 15.50),
        ('WA', 'WA Northern Demersal Scalefish Fishery', 'WA-NDS', 'KG', 12.80),
        ('WA', 'WA Octopus Fishery', 'WA-OCT', 'KG', 8.30),
        ('WA', 'WA Crab Fishery', 'WA-CRAB', 'KG', 14.60),
        ('TAS', 'Tasmanian Rock Lobster Fishery', 'TAS-RL', 'UNITS', 390.00),
        ('TAS', 'Tasmanian Abalone Fishery', 'TAS-AB', 'KG', 95.00),
        ('TAS', 'Tasmanian Giant Crab Fishery', 'TAS-GC', 'KG', 48.00),
        ('TAS', 'Tasmanian Scalefish Fishery', 'TAS-SF', 'KG', 7.20),
        ('TAS', 'Tasmanian Scallop Fishery', 'TAS-SC', 'KG', 8.80),
        ('TAS', 'Tasmanian Commercial Dive Fishery', 'TAS-CD', 'KG', 13.50),
        ('TAS', 'Tasmanian Marine Plant Fishery', 'TAS-MP', 'KG', 4.60),
        ('NT', 'NT Barramundi Fishery', 'NT-BAR', 'KG', 14.80),
        ('NT', 'NT Mud Crab Fishery', 'NT-MCR', 'KG', 26.00),
        ('NT', 'NT Offshore Snapper Fishery', 'NT-OSN', 'KG', 11.40),
        ('NT', 'NT Demersal Fishery', 'NT-DEM', 'KG', 9.60),
        ('NT', 'NT Spanish Mackerel Fishery', 'NT-SM', 'KG', 13.20),
        ('NT', 'NT Coastal Line Fishery', 'NT-CL', 'KG', 8.10),
        ('NT', 'NT Trepang Fishery', 'NT-TRE', 'KG', 18.50),
        ('NT', 'NT Aquarium Fishery', 'NT-AQ', 'UNITS', 28.00);

    insert into public.fisheries (jurisdiction_id, name, code, quantity_type)
    select j.id, s.name, s.code, s.quantity_type
    from seed_fishery as s
    join public.jurisdictions as j on j.code = s.jurisdiction_code
    where not exists (
        select 1
        from public.fisheries as f
        where f.name = s.name or f.code = s.code
    );

    insert into public.stocks (fishery_id, name)
    select f.id, v.stock_name
    from public.fisheries as f
    join seed_fishery as s on s.name = f.name
    cross join (
        values ('Northern zone'), ('Southern zone')
    ) as v(stock_name)
    where not exists (
        select 1
        from public.stocks as st
        where st.fishery_id = f.id
          and st.name = v.stock_name
    );

    insert into public.seasons (fishery_id, name, starts_on, ends_on)
    select f.id, v.season_name, v.starts_on, v.ends_on
    from public.fisheries as f
    join seed_fishery as s on s.name = f.name
    cross join (
        values
            ('2024-25', '2024-07-01'::date, '2025-06-30'::date),
            ('2025-26', '2025-07-01'::date, '2026-06-30'::date),
            ('2026-27', '2026-07-01'::date, '2027-06-30'::date)
    ) as v(season_name, starts_on, ends_on)
    where not exists (
        select 1
        from public.seasons as se
        where se.fishery_id = f.id
          and se.name = v.season_name
    );

    insert into public.quota_types (
        fishery_id, measurement_kind, name, unit_label
    )
    select
        f.id,
        case when f.quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end,
        case when f.quantity_type = 'KG' then 'Catch quota' else 'Quota units' end,
        case when f.quantity_type = 'KG' then 'kg' else 'units' end
    from public.fisheries as f
    join seed_fishery as s on s.name = f.name
    where not exists (
        select 1
        from public.quota_types as qt
        where qt.fishery_id = f.id
    );

    create temporary table seed_org (
        legal_name text not null,
        slug text not null
    ) on commit drop;

    insert into seed_org (legal_name, slug)
    values
        ('Southern Bluefin Co Pty Ltd', 'southern-bluefin'),
        ('Gulf Prawn Operators Pty Ltd', 'gulf-prawn'),
        ('HIMI Toothfish Pty Ltd', 'himi-toothfish'),
        ('East Coast Trawl Pty Ltd', 'east-coast-trawl'),
        ('Spencer Gulf Seafood Pty Ltd', 'spencer-gulf'),
        ('Western Rock Lobster Co Pty Ltd', 'western-rock-lobster'),
        ('Tasmanian Abalone Pty Ltd', 'tasmanian-abalone'),
        ('Darwin Mud Crab Pty Ltd', 'darwin-mud-crab'),
        ('Bass Strait Scallop Pty Ltd', 'bass-strait-scallop'),
        ('Coral Coast Quota Pty Ltd', 'coral-coast'),
        ('Port Lincoln Sardines Pty Ltd', 'port-lincoln'),
        ('Fremantle Quota Holdings Pty Ltd', 'fremantle-quota'),
        ('Lakes Entrance Trawl Pty Ltd', 'lakes-entrance'),
        ('Cairns Reef Fish Pty Ltd', 'cairns-reef'),
        ('Kangaroo Island Abalone Pty Ltd', 'kangaroo-island'),
        ('Geraldton Lobster Pty Ltd', 'geraldton-lobster'),
        ('Hobart Dive Quota Pty Ltd', 'hobart-dive'),
        ('Nhulunbuy Barramundi Pty Ltd', 'nhulunbuy'),
        ('Ulladulla Ocean Trap Pty Ltd', 'ulladulla'),
        ('Portland Tuna Pty Ltd', 'portland-tuna'),
        ('Bundaberg Crab Pty Ltd', 'bundaberg-crab'),
        ('Ceduna Pipi Pty Ltd', 'ceduna-pipi'),
        ('Broome Pearl Quota Pty Ltd', 'broome-pearl'),
        ('St Helens Scalefish Pty Ltd', 'st-helens'),
        ('Gove Demersal Pty Ltd', 'gove-demersal'),
        ('Eden Trap and Line Pty Ltd', 'eden-trap'),
        ('Mackay Mackerel Pty Ltd', 'mackay-mackerel'),
        ('Albany Demersal Pty Ltd', 'albany-demersal'),
        ('Mooloolaba Billfish Pty Ltd', 'mooloolaba'),
        ('Apollo Bay Urchin Pty Ltd', 'apollo-bay');

    insert into public.organisations (legal_name, trading_name, abn)
    select
        seed_org.legal_name,
        'FQX seed',
        lpad((81000000000 + row_number() over (order by seed_org.legal_name))::text, 11, '0')
    from seed_org;

    insert into public.organisation_users (organisation_id, email, role)
    select o.id, 'owner.' || seed_org.slug || '@seed.fqx.example', 'OWNER'
    from seed_org
    join public.organisations as o on o.legal_name = seed_org.legal_name
    union all
    select o.id, 'admin.' || seed_org.slug || '@seed.fqx.example', 'ADMIN'
    from seed_org
    join public.organisations as o on o.legal_name = seed_org.legal_name
    union all
    select o.id, 'member.' || seed_org.slug || '@seed.fqx.example', 'MEMBER'
    from seed_org
    join public.organisations as o on o.legal_name = seed_org.legal_name;

    insert into public.organisation_users (organisation_id, email, role)
    select next_org.id, members.email, 'MEMBER'
    from (
        select
            o.id,
            ou.email,
            lead(o.id) over (order by o.id) as next_id
        from public.organisations as o
        join public.organisation_users as ou
          on ou.organisation_id = o.id
         and ou.role = 'MEMBER'
        where o.trading_name = 'FQX seed'
    ) as members
    join public.organisations as next_org on next_org.id = members.next_id
    where members.next_id is not null;

    insert into public.verified_users (email, verified_by_email)
    select distinct ou.email, 'seed.market@fqx.example'
    from public.organisation_users as ou
    join public.organisations as o on o.id = ou.organisation_id
    where o.trading_name = 'FQX seed'
      and ou.role in ('OWNER', 'ADMIN')
    on conflict (email) do nothing;

    select
        array_agg(o.id order by o.id),
        array_agg(o.legal_name order by o.id),
        array_agg(ou.email order by o.id)
    into v_org_ids, v_org_names, v_org_emails
    from public.organisations as o
    join public.organisation_users as ou
      on ou.organisation_id = o.id
     and ou.role = 'OWNER'
    where o.trading_name = 'FQX seed';

    v_org_count := coalesce(array_length(v_org_ids, 1), 0);

    for v_fishery in
        select
            f.id,
            f.name,
            f.quantity_type,
            coalesce(s.base_price, 10.00) as base_price
        from public.fisheries as f
        left join seed_fishery as s on s.name = f.name
        order by f.id
    loop
        v_unit := case when v_fishery.quantity_type = 'KG' then 'kg' else 'units' end;
        v_kind := case when v_fishery.quantity_type = 'KG' then 'WEIGHT' else 'UNITS' end;
        v_base := v_fishery.base_price;

        select name into v_stock
        from public.stocks
        where fishery_id = v_fishery.id
        order by id
        limit 1;

        select name into v_season
        from public.seasons
        where fishery_id = v_fishery.id
        order by starts_on desc
        limit 1;

        select name into v_quota
        from public.quota_types
        where fishery_id = v_fishery.id
        order by id
        limit 1;

        v_stock := coalesce(v_stock, 'Managed stock');
        v_season := coalesce(v_season, '2025-26');
        v_quota := coalesce(v_quota, 'Catch quota');

        for v_n in 0..2 loop
            v_seller_idx := 1 + ((v_fishery.id::int + v_n * 11) % v_org_count);
            if not exists (
                select 1
                from public.quota_holdings
                where organisation_id = v_org_ids[v_seller_idx]
                  and fishery_id = v_fishery.id
            ) then
                insert into public.quota_holdings (
                    organisation_id,
                    fishery_id,
                    quantity,
                    verification_status,
                    verified_at,
                    verified_by_email
                )
                values (
                    v_org_ids[v_seller_idx],
                    v_fishery.id,
                    250000,
                    'VERIFIED',
                    timestamptz '2025-01-15',
                    'seed.market@fqx.example'
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
                    250000,
                    250000,
                    'Seed allocation',
                    v_org_emails[v_seller_idx],
                    timestamptz '2025-01-15'
                );
            end if;
        end loop;

        select h.id
        into v_holding_id
        from public.quota_holdings as h
        where h.fishery_id = v_fishery.id
          and h.organisation_id = any (v_org_ids)
        order by h.id
        limit 1;

        if v_holding_id is null then
            continue;
        end if;

        select array_position(v_org_ids, h.organisation_id)
        into v_seller_idx
        from public.quota_holdings as h
        where h.id = v_holding_id;

        if v_seller_idx is null then
            continue;
        end if;

        for v_n in 0..35 loop
            v_at := timestamptz '2025-02-03 04:00:00+00' + (v_n * interval '14 days')
                + ((v_fishery.id % 5) * interval '3 hours');
            v_price := round(
                (
                    v_base * (
                        0.82
                        + 0.28 * (v_n / 35.0)
                        + 0.07 * sin(v_n * 0.65)
                        + 0.04 * sin(v_n * 1.8 + v_fishery.id)
                    )
                )::numeric,
                2
            );
            v_qty := round((80 + ((v_n * 17 + v_fishery.id * 13) % 240))::numeric, 0);
            if v_price < 0.50 then
                v_price := 0.50;
            end if;
            v_amount := round(v_qty * v_price, 2);
            v_buyer_idx := 1 + ((v_seller_idx + 3 + v_n) % v_org_count);
            if v_buyer_idx = v_seller_idx then
                v_buyer_idx := 1 + (v_seller_idx % v_org_count);
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
                stock_name,
                season_name,
                quota_type_name,
                measurement_kind,
                unit_label,
                created_by_email,
                created_at,
                reviewed_by_email,
                reviewed_at
            )
            values (
                v_org_ids[v_seller_idx],
                v_holding_id,
                'FIXED_PRICE',
                'SALE',
                v_qty,
                v_price,
                v_at + interval '14 days',
                'SOLD',
                v_org_names[v_seller_idx],
                v_fishery.name,
                v_stock,
                v_season,
                v_quota,
                v_kind,
                v_unit,
                v_org_emails[v_seller_idx],
                v_at,
                'seed.market@fqx.example',
                v_at + interval '1 day'
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
                stock_name,
                season_name,
                quota_type_name,
                measurement_kind,
                unit_label,
                created_by_email,
                created_at
            )
            values (
                v_listing_id,
                v_holding_id,
                v_org_ids[v_seller_idx],
                v_org_ids[v_buyer_idx],
                'SALE',
                v_qty,
                v_price,
                v_amount,
                'COMPLETED',
                v_org_names[v_seller_idx],
                v_org_names[v_buyer_idx],
                v_fishery.name,
                v_stock,
                v_season,
                v_quota,
                v_kind,
                v_unit,
                v_org_emails[v_buyer_idx],
                v_at + interval '2 days'
            );
        end loop;

        for v_n in 0..11 loop
            v_at := timestamptz '2025-03-10 05:00:00+00' + (v_n * interval '28 days');
            v_price := round((v_base * 0.22 * (0.9 + 0.2 * sin(v_n * 0.9)))::numeric, 2);
            if v_price < 0.50 then
                v_price := 0.50;
            end if;
            v_qty := round((40 + ((v_n * 11 + v_fishery.id * 7) % 120))::numeric, 0);
            v_amount := round(v_qty * v_price, 2);
            v_buyer_idx := 1 + ((v_seller_idx + 5 + v_n) % v_org_count);
            if v_buyer_idx = v_seller_idx then
                v_buyer_idx := 1 + ((v_seller_idx + 1) % v_org_count);
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
                stock_name,
                season_name,
                quota_type_name,
                measurement_kind,
                unit_label,
                created_by_email,
                created_at,
                reviewed_by_email,
                reviewed_at
            )
            values (
                v_org_ids[v_seller_idx],
                v_holding_id,
                'FIXED_PRICE',
                'LEASE',
                v_qty,
                v_price,
                v_at + interval '21 days',
                'SOLD',
                v_org_names[v_seller_idx],
                v_fishery.name,
                v_stock,
                v_season,
                v_quota,
                v_kind,
                v_unit,
                v_org_emails[v_seller_idx],
                v_at,
                'seed.market@fqx.example',
                v_at + interval '1 day'
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
                stock_name,
                season_name,
                quota_type_name,
                measurement_kind,
                unit_label,
                created_by_email,
                created_at
            )
            values (
                v_listing_id,
                v_holding_id,
                v_org_ids[v_seller_idx],
                v_org_ids[v_buyer_idx],
                'LEASE',
                v_qty,
                v_price,
                v_amount,
                'COMPLETED',
                v_org_names[v_seller_idx],
                v_org_names[v_buyer_idx],
                v_fishery.name,
                v_stock,
                v_season,
                v_quota,
                v_kind,
                v_unit,
                v_org_emails[v_buyer_idx],
                v_at + interval '3 days'
            );
        end loop;

        v_price := round((v_base * 1.05)::numeric, 2);
        v_qty := 120 + (v_fishery.id % 80);

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
            stock_name,
            season_name,
            quota_type_name,
            measurement_kind,
            unit_label,
            created_by_email,
            created_at,
            reviewed_by_email,
            reviewed_at
        )
        values (
            v_org_ids[v_seller_idx],
            v_holding_id,
            'FIXED_PRICE',
            'SALE',
            v_qty,
            v_price,
            now() + interval '45 days',
            'PUBLISHED',
            v_org_names[v_seller_idx],
            v_fishery.name,
            v_stock,
            v_season,
            v_quota,
            v_kind,
            v_unit,
            v_org_emails[v_seller_idx],
            now() - interval '3 days',
            'seed.market@fqx.example',
            now() - interval '2 days'
        );

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
            stock_name,
            season_name,
            quota_type_name,
            measurement_kind,
            unit_label,
            created_by_email,
            created_at,
            reviewed_by_email,
            reviewed_at
        )
        values (
            v_org_ids[v_seller_idx],
            v_holding_id,
            'FIXED_PRICE',
            'LEASE',
            round((v_qty * 0.6)::numeric, 0),
            round((v_base * 0.24)::numeric, 2),
            now() + interval '60 days',
            'PUBLISHED',
            v_org_names[v_seller_idx],
            v_fishery.name,
            v_stock,
            v_season,
            v_quota,
            v_kind,
            v_unit,
            v_org_emails[v_seller_idx],
            now() - interval '4 days',
            'seed.market@fqx.example',
            now() - interval '3 days'
        );

        v_start := now() - interval '2 days';
        v_end := now() + interval '6 days';
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
            stock_name,
            season_name,
            quota_type_name,
            measurement_kind,
            unit_label,
            created_by_email,
            created_at,
            reviewed_by_email,
            reviewed_at,
            starting_price_aud,
            reserve_price_aud,
            bid_increment_aud,
            starts_at
        )
        values (
            v_org_ids[v_seller_idx],
            v_holding_id,
            'AUCTION',
            'SALE',
            90 + (v_fishery.id % 40),
            round((v_base * 0.95)::numeric, 2),
            v_end,
            'PUBLISHED',
            v_org_names[v_seller_idx],
            v_fishery.name,
            v_stock,
            v_season,
            v_quota,
            v_kind,
            v_unit,
            v_org_emails[v_seller_idx],
            now() - interval '5 days',
            'seed.market@fqx.example',
            now() - interval '4 days',
            round((v_base * 0.95)::numeric, 2),
            round((v_base * 1.1)::numeric, 2),
            greatest(round((v_base * 0.04)::numeric, 2), 0.50),
            v_start
        )
        returning id into v_listing_id;

        v_buyer_idx := 1 + ((v_seller_idx + 2) % v_org_count);
        if v_buyer_idx = v_seller_idx then
            v_buyer_idx := 1 + ((v_seller_idx + 1) % v_org_count);
        end if;

        insert into public.bids (
            listing_id, organisation_id, bidder_name, amount_aud, created_at
        )
        values (
            v_listing_id,
            v_org_ids[v_buyer_idx],
            v_org_names[v_buyer_idx],
            round((v_base * 0.95)::numeric, 2),
            v_start + interval '6 hours'
        );

        v_buyer_idx := 1 + ((v_seller_idx + 4) % v_org_count);
        if v_buyer_idx = v_seller_idx then
            v_buyer_idx := 1 + ((v_seller_idx + 2) % v_org_count);
        end if;

        insert into public.bids (
            listing_id, organisation_id, bidder_name, amount_aud, created_at
        )
        values (
            v_listing_id,
            v_org_ids[v_buyer_idx],
            v_org_names[v_buyer_idx],
            round((v_base * 0.99)::numeric, 2),
            v_start + interval '18 hours'
        );

        update public.listings
        set unit_price_aud = round((v_base * 0.99)::numeric, 2)
        where id = v_listing_id;

        if v_fishery.id % 3 = 0 then
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
                stock_name,
                season_name,
                quota_type_name,
                measurement_kind,
                unit_label,
                created_by_email,
                created_at
            )
            values (
                v_org_ids[v_seller_idx],
                v_holding_id,
                'FIXED_PRICE',
                case when v_fishery.id % 6 = 0 then 'LEASE' else 'SALE' end,
                75,
                v_price,
                now() + interval '30 days',
                'PENDING_APPROVAL',
                v_org_names[v_seller_idx],
                v_fishery.name,
                v_stock,
                v_season,
                v_quota,
                v_kind,
                v_unit,
                v_org_emails[v_seller_idx],
                now() - interval '1 day'
            );
        end if;

        if v_fishery.id % 5 = 0 then
            v_status := case (v_fishery.id % 15)
                when 0 then 'AWAITING_COMPLIANCE'
                when 5 then 'AWAITING_TRANSFER'
                else 'AWAITING_SETTLEMENT'
            end;
            v_offering := case when v_fishery.id % 10 = 0 then 'LEASE' else 'SALE' end;
            v_qty := 55;
            v_amount := round(v_qty * v_price, 2);
            v_buyer_idx := 1 + ((v_seller_idx + 6) % v_org_count);
            if v_buyer_idx = v_seller_idx then
                v_buyer_idx := 1 + ((v_seller_idx + 1) % v_org_count);
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
                stock_name,
                season_name,
                quota_type_name,
                measurement_kind,
                unit_label,
                created_by_email,
                created_at,
                reviewed_by_email,
                reviewed_at
            )
            values (
                v_org_ids[v_seller_idx],
                v_holding_id,
                'FIXED_PRICE',
                v_offering,
                v_qty,
                v_price,
                now() + interval '20 days',
                'RESERVED',
                v_org_names[v_seller_idx],
                v_fishery.name,
                v_stock,
                v_season,
                v_quota,
                v_kind,
                v_unit,
                v_org_emails[v_seller_idx],
                now() - interval '6 days',
                'seed.market@fqx.example',
                now() - interval '5 days'
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
                stock_name,
                season_name,
                quota_type_name,
                measurement_kind,
                unit_label,
                created_by_email,
                created_at
            )
            values (
                v_listing_id,
                v_holding_id,
                v_org_ids[v_seller_idx],
                v_org_ids[v_buyer_idx],
                v_offering,
                v_qty,
                v_price,
                v_amount,
                v_status,
                v_org_names[v_seller_idx],
                v_org_names[v_buyer_idx],
                v_fishery.name,
                v_stock,
                v_season,
                v_quota,
                v_kind,
                v_unit,
                v_org_emails[v_buyer_idx],
                now() - interval '4 days'
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
                v_listing_id,
                v_holding_id,
                v_qty,
                'ACTIVE'
            );
        end if;
    end loop;

    for v_n in 1..8 loop
        v_seller_idx := v_n;
        select f.id into v_holding_id
        from public.fisheries as f
        order by f.id
        offset (v_n * 3)
        limit 1;

        if v_holding_id is null then
            continue;
        end if;

        if exists (
            select 1
            from public.quota_holdings
            where organisation_id = v_org_ids[v_seller_idx]
              and fishery_id = v_holding_id
        ) then
            continue;
        end if;

        insert into public.quota_holdings (
            organisation_id,
            fishery_id,
            quantity,
            verification_status
        )
        values (
            v_org_ids[v_seller_idx],
            v_holding_id,
            800,
            'PENDING_VERIFICATION'
        )
        returning id into v_buyer_holding_id;

        insert into public.quota_ledger (
            holding_id,
            event_type,
            quantity_delta,
            quantity_after,
            note,
            created_by_email
        )
        values (
            v_buyer_holding_id,
            'INITIAL_ALLOCATION',
            800,
            800,
            'Unverified seed holding',
            v_org_emails[v_seller_idx]
        );
    end loop;
end;
$$;

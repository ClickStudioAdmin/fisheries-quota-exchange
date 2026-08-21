-- Replace the fishery catalogue with Queensland transfer-form quota types.
-- Sale = FDU1465, lease = FDU1469. Names are the bracket text; codes are the
-- text before the brackets. Keep quota_ledger rows (unlink holdings first).

alter table public.fisheries
    add column if not exists sale_allowed boolean not null default true;

alter table public.fisheries
    add column if not exists lease_allowed boolean not null default true;

alter table public.fisheries
    drop constraint if exists fisheries_offering_allowed_check;

alter table public.fisheries
    add constraint fisheries_offering_allowed_check
        check (sale_allowed or lease_allowed);

alter table public.listings
    add column if not exists unused_quantity numeric,
    add column if not exists used_quantity numeric;

alter table public.orders
    add column if not exists unused_quantity numeric,
    add column if not exists used_quantity numeric;

create or replace function public.fishery_allows_offering(
    p_fishery_id bigint,
    p_offering text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select case
        when p_offering = 'SALE' then fisheries.sale_allowed
        when p_offering = 'LEASE' then fisheries.lease_allowed
        else false
    end
    from public.fisheries
    where fisheries.id = p_fishery_id
$$;

revoke all on function public.fishery_allows_offering(bigint, text) from public;
grant execute on function public.fishery_allows_offering(bigint, text) to authenticated;

create or replace function public.create_listing(
    p_holding_id bigint,
    p_offering text,
    p_quantity numeric,
    p_unit_price_aud numeric,
    p_expires_at timestamptz
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_id bigint;
    v_seller text;
    v_fishery text;
    v_quota_type text;
    v_kind text;
    v_unit text;
    v_committed numeric;
    v_quantity_type text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = p_holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_role := public.user_organisation_role(v_holding.organisation_id);

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot list quota for this organisation';
    end if;

    if p_offering not in ('SALE', 'LEASE') then
        raise exception 'Offering must be SALE or LEASE';
    end if;

    if not coalesce(
        public.fishery_allows_offering(v_holding.fishery_id, p_offering),
        false
    ) then
        raise exception 'This fishery cannot be listed for %', lower(p_offering);
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    v_committed := public.holding_committed_quantity(p_holding_id);

    if p_quantity > v_holding.quantity - v_committed then
        raise exception 'Quantity cannot exceed the available holding';
    end if;

    if p_unit_price_aud is null or p_unit_price_aud <= 0 then
        raise exception 'Price must be greater than zero';
    end if;

    if p_expires_at is null or p_expires_at <= now() then
        raise exception 'Expiry must be in the future';
    end if;

    select o.legal_name into v_seller
    from public.organisations as o
    where o.id = v_holding.organisation_id;

    select
        fisheries.name,
        fisheries.quantity_type
    into v_fishery, v_quantity_type
    from public.fisheries as fisheries
    where fisheries.id = v_holding.fishery_id;

    v_unit := public.fishery_unit_label(v_quantity_type);
    v_quota_type := v_unit;
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
        created_by_email
    )
    values (
        v_holding.organisation_id,
        p_holding_id,
        'FIXED_PRICE',
        p_offering,
        p_quantity,
        p_unit_price_aud,
        p_expires_at,
        'PENDING_APPROVAL',
        v_seller,
        v_fishery,
        v_quota_type,
        v_kind,
        v_unit,
        public.current_user_email()
    )
    returning id into v_id;

    return v_id;
end;
$$;

create or replace function public.create_auction(
    p_holding_id bigint,
    p_offering text,
    p_quantity numeric,
    p_starting_price_aud numeric,
    p_bid_increment_aud numeric,
    p_reserve_price_aud numeric,
    p_starts_at timestamptz,
    p_ends_at timestamptz
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_id bigint;
    v_seller text;
    v_fishery text;
    v_quota_type text;
    v_kind text;
    v_unit text;
    v_committed numeric;
    v_starts timestamptz;
    v_quantity_type text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = p_holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_role := public.user_organisation_role(v_holding.organisation_id);

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot auction quota for this organisation';
    end if;

    if p_offering not in ('SALE', 'LEASE') then
        raise exception 'Offering must be SALE or LEASE';
    end if;

    if not coalesce(
        public.fishery_allows_offering(v_holding.fishery_id, p_offering),
        false
    ) then
        raise exception 'This fishery cannot be listed for %', lower(p_offering);
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    v_committed := public.holding_committed_quantity(p_holding_id);

    if p_quantity > v_holding.quantity - v_committed then
        raise exception 'Quantity cannot exceed the available holding';
    end if;

    if p_starting_price_aud is null or p_starting_price_aud <= 0 then
        raise exception 'Starting price must be greater than zero';
    end if;

    if p_bid_increment_aud is null or p_bid_increment_aud <= 0 then
        raise exception 'Bid increment must be greater than zero';
    end if;

    if p_reserve_price_aud is not null and p_reserve_price_aud <= 0 then
        raise exception 'Reserve price must be greater than zero';
    end if;

    v_starts := coalesce(p_starts_at, now());

    if p_ends_at is null or p_ends_at <= now() then
        raise exception 'Auction end must be in the future';
    end if;

    if v_starts >= p_ends_at then
        raise exception 'Auction start must be before the end';
    end if;

    select o.legal_name into v_seller
    from public.organisations as o
    where o.id = v_holding.organisation_id;

    select
        fisheries.name,
        fisheries.quantity_type
    into v_fishery, v_quantity_type
    from public.fisheries as fisheries
    where fisheries.id = v_holding.fishery_id;

    v_unit := public.fishery_unit_label(v_quantity_type);
    v_quota_type := v_unit;
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
        starting_price_aud,
        reserve_price_aud,
        bid_increment_aud,
        starts_at
    )
    values (
        v_holding.organisation_id,
        p_holding_id,
        'AUCTION',
        p_offering,
        p_quantity,
        p_starting_price_aud,
        p_ends_at,
        'PENDING_APPROVAL',
        v_seller,
        v_fishery,
        v_quota_type,
        v_kind,
        v_unit,
        public.current_user_email(),
        p_starting_price_aud,
        p_reserve_price_aud,
        p_bid_increment_aud,
        v_starts
    )
    returning id into v_id;

    return v_id;
end;
$$;

delete from public.transfer_documents;
delete from public.transfer_applications;
delete from public.payments;
delete from public.transactions;
delete from public.quota_reservations;
delete from public.bids;
delete from public.orders;
delete from public.listings;
delete from public.listing_alerts;

alter table public.quota_ledger disable trigger quota_ledger_no_update;

alter table public.quota_ledger
    drop constraint if exists quota_ledger_holding_id_fkey;

alter table public.quota_ledger
    alter column holding_id drop not null;

update public.quota_ledger
set holding_id = null
where holding_id is not null;

delete from public.quota_holdings;

alter table public.quota_ledger
    add constraint quota_ledger_holding_id_fkey
        foreign key (holding_id) references public.quota_holdings (id)
        on delete restrict;

alter table public.quota_ledger enable trigger quota_ledger_no_update;

delete from public.quota_types;
delete from public.fishery_rules;

do $$
begin
    if to_regclass('public.stocks') is not null then
        execute 'delete from public.stocks';
    end if;
    if to_regclass('public.seasons') is not null then
        execute 'delete from public.seasons';
    end if;
end;
$$;

delete from public.fisheries;

insert into public.fisheries (
    jurisdiction_id,
    name,
    code,
    quantity_type,
    sale_allowed,
    lease_allowed
)
select
    jurisdictions.id,
    v.name,
    v.code,
    'UNITS',
    v.sale_allowed,
    v.lease_allowed
from public.jurisdictions
join (
    values
        ('BC1-ITQ', 'Blue Swimmer Crab East Coast East', true, true),
        ('EC1-ITQ', 'Mud Crab East', true, true),
        ('GC1-ITQ', 'Mud Crab Gulf', true, true),
        ('C2-ITQ', 'Spanner Crab', true, true),
        ('BM1-ITQ', 'Barramundi Region 1', false, true),
        ('BM2-ITQ', 'Barramundi Region 2', false, true),
        ('BM3-ITQ', 'Barramundi Region 3', false, true),
        ('BM4-ITQ', 'Barramundi Region 4', false, true),
        ('BM5-ITQ', 'Barramundi Region 5', false, true),
        ('GM1-ITQ', 'Grey Mackerel Region 1', false, true),
        ('GM2-ITQ', 'Grey Mackerel Region 2', false, true),
        ('GM3-ITQ', 'Grey Mackerel Region 3', false, true),
        ('GM4-ITQ', 'Grey Mackerel Region 4', false, true),
        ('GM5-ITQ', 'Grey Mackerel Region 5', true, true),
        ('KT1-ITQ', 'King Threadfin Region 1', false, true),
        ('KT2-ITQ', 'King Threadfin Region 2', false, true),
        ('KT3-ITQ', 'King Threadfin Region 3', false, true),
        ('KT4-ITQ', 'King Threadfin Region 4', false, true),
        ('KT5-ITQ', 'King Threadfin Region 5', false, true),
        ('WT5-ITQ', 'Sand Whiting Region 5', true, true),
        ('SCM5-ITQ', 'School Mackerel Region 5', true, true),
        ('CT Line Units', 'Coral Trout', true, true),
        ('RTE Line Units', 'Red Throat Emperor', true, true),
        ('OS Line Units', 'Other Species', true, true),
        ('SM Units', 'Spanish Mackerel', true, true),
        ('Norther Trawl Effort Units', 'Northern Trawl Region 1', true, true),
        ('Central Trawl Effort Units', 'Northern Trawl Region 2', true, true),
        ('Southern Inshore Trawl Effort Units', 'Southern Inshore Trawl Region 3', true, true),
        ('Southern Offshore Trawl Effort Units', 'Southern Offshore Trawl Region 4A', true, true),
        ('Southern Offshore Trawl Effort Units', 'Southern Offshore Trawl Region 4B', true, true),
        ('Moreton Bay Trawl Effort Units', 'Moreton Bay Trawl Region 5', true, true),
        ('T4-ITQ Units', 'Prescribed Whiting', true, true),
        ('B1B-ITQ', 'Black Teatfish', true, true),
        ('B1O-ITQ', 'Other Beche-de-mer', true, true),
        ('B1W-ITQ', 'White Teatfish', true, true),
        ('DO-ITQ', 'Other Coral', true, true),
        ('DS-ITQ', 'Specialty Coral', true, true),
        ('DS22-ITQ', 'Euphyllia glabrescens', true, true),
        ('DS23-ITQ', 'Fimbriaphyllia ancora', true, true),
        ('DS28-ITQ', 'Cycloseris cyclolites', true, true),
        ('DS36-ITQ', 'Acanthophyllia deshayesiana', true, true),
        ('DS39-ITQ', 'Homophyllia cf. australis', true, true),
        ('DS48-ITQ', 'Micromussa lordhowensis', true, true),
        ('DS74-ITQ', 'Trachyphyllia geoffroyi', true, true),
        ('G-ITQ', 'Shell Grit', true, true),
        ('J1-ITQ', 'Trochus', true, true),
        ('R-ITQ', 'Red Champagne Lobster and Tropical Rock Lobster', true, true)
) as v(code, name, sale_allowed, lease_allowed) on true
where jurisdictions.code = 'QLD';

do $$
declare
    v_org record;
    v_email text;
    v_fishery record;
    v_holding_id bigint;
    v_qty numeric;
    v_list_qty numeric;
    v_used numeric;
    v_price numeric;
    v_offering text;
    v_unit text;
    v_kind text;
    v_index int;
    v_created_holdings int := 0;
    v_created_listings int := 0;
    v_listing_n int;
begin
    if not exists (select 1 from public.fisheries) then
        raise exception 'Queensland jurisdiction is missing; cannot seed form fisheries';
    end if;

    for v_org in
        select
            organisations.id,
            organisations.legal_name,
            public.organisation_may_sell(organisations.id) as may_sell
        from public.organisations
        where public.organisation_is_trade_ready(organisations.id, true)
        order by organisations.id
    loop
        select organisation_users.email
        into v_email
        from public.organisation_users
        where organisation_users.organisation_id = v_org.id
        order by
            case organisation_users.role
                when 'OWNER' then 0
                when 'ADMIN' then 1
                else 2
            end,
            organisation_users.id
        limit 1;

        v_email := coalesce(v_email, 'seed.qld@fqx.example');
        v_index := 0;
        v_listing_n := 0;

        for v_fishery in
            select
                fisheries.id,
                fisheries.name,
                fisheries.quantity_type,
                fisheries.sale_allowed,
                fisheries.lease_allowed
            from public.fisheries
            order by fisheries.id
            offset (v_org.id % 11)
            limit 8
        loop
            v_qty := 4000 + ((v_org.id + v_fishery.id) % 7) * 500;

            insert into public.quota_holdings (
                organisation_id,
                fishery_id,
                quantity,
                verification_status,
                verified_at,
                verified_by_email
            )
            values (
                v_org.id,
                v_fishery.id,
                v_qty,
                'VERIFIED',
                now() - interval '3 days',
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
                v_qty,
                v_qty,
                'QLD form-fishery reset holding',
                v_email
            );

            v_created_holdings := v_created_holdings + 1;
            v_index := v_index + 1;

            if not v_org.may_sell or v_listing_n >= 3 then
                continue;
            end if;

            v_unit := public.fishery_unit_label(v_fishery.quantity_type);
            v_kind := case
                when v_fishery.quantity_type = 'KG' then 'WEIGHT'
                else 'UNITS'
            end;
            v_list_qty := 250 + (v_index * 50);
            v_used := round(v_list_qty * 0.2, 0);
            v_price := round(
                (4.5 + ((v_fishery.id % 17) * 1.75))::numeric,
                2
            );

            if v_listing_n = 0 and v_fishery.sale_allowed then
                v_offering := 'SALE';
            elsif v_fishery.lease_allowed then
                v_offering := 'LEASE';
            elsif v_fishery.sale_allowed then
                v_offering := 'SALE';
            else
                continue;
            end if;

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
                v_org.id,
                v_holding_id,
                case when v_listing_n = 2 then 'AUCTION' else 'FIXED_PRICE' end,
                v_offering,
                v_list_qty,
                v_list_qty - v_used,
                v_used,
                v_price,
                now() + interval '40 days',
                'PUBLISHED',
                v_org.legal_name,
                v_fishery.name,
                v_unit,
                v_kind,
                v_unit,
                v_email,
                now() - interval '1 day',
                v_email,
                now() - interval '1 day',
                'QLD form-fishery reset listing',
                case when v_listing_n = 2 then v_price else null end,
                case when v_listing_n = 2 then round(v_price * 1.15, 2) else null end,
                case when v_listing_n = 2 then 1.00 else null end,
                case when v_listing_n = 2 then now() - interval '2 hours' else null end
            );

            v_created_listings := v_created_listings + 1;
            v_listing_n := v_listing_n + 1;
        end loop;
    end loop;

    perform public.write_audit_event(
        'QLD_FORM_FISHERY_RESET',
        'platform',
        0,
        jsonb_build_object(
            'holdings_created', v_created_holdings,
            'listings_created', v_created_listings
        ),
        null
    );
end;
$$;

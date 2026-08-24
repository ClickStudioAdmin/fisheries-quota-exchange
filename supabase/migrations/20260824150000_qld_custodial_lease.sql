-- Phase 12: QLD temporary FishNet custodianship for leases.

-- ---------------------------------------------------------------------------
-- Holdings: custody kind + cancelled status
-- ---------------------------------------------------------------------------

alter table public.quota_holdings
    add column if not exists custody_kind text not null default 'MEMBER';

alter table public.quota_holdings
    drop constraint if exists quota_holdings_custody_kind_check;

alter table public.quota_holdings
    add constraint quota_holdings_custody_kind_check
        check (custody_kind in ('MEMBER', 'FQX_CUSTODIAL'));

alter table public.quota_holdings
    drop constraint if exists quota_holdings_verification_status_check;

alter table public.quota_holdings
    add constraint quota_holdings_verification_status_check
        check (
            verification_status in (
                'PENDING_VERIFICATION',
                'VERIFIED',
                'CANCELLED'
            )
        );

drop index if exists quota_holdings_org_fishery_custody_active_idx;

create unique index quota_holdings_org_fishery_custody_active_idx
    on public.quota_holdings (organisation_id, fishery_id, custody_kind)
    where verification_status <> 'CANCELLED';

-- ---------------------------------------------------------------------------
-- Orders: lease outbound checklist
-- ---------------------------------------------------------------------------

alter table public.orders
    add column if not exists lease_outbound_checklist jsonb not null default '[]'::jsonb;

alter table public.orders
    drop constraint if exists orders_lease_outbound_checklist_array;

alter table public.orders
    add constraint orders_lease_outbound_checklist_array
        check (jsonb_typeof(lease_outbound_checklist) = 'array');

-- ---------------------------------------------------------------------------
-- Custody release requests
-- ---------------------------------------------------------------------------

create table if not exists public.custody_release_requests (
    id bigint generated always as identity primary key,
    organisation_id bigint not null references public.organisations (id) on delete cascade,
    holding_id bigint not null references public.quota_holdings (id) on delete restrict,
    quantity numeric not null check (quantity > 0),
    status text not null default 'PENDING'
        check (status in ('PENDING', 'COMPLETED', 'CANCELLED')),
    fishnet_reference text,
    admin_notes text,
    created_by_email text,
    completed_by_email text,
    created_at timestamptz not null default now(),
    completed_at timestamptz,
    cancelled_at timestamptz
);

create index if not exists custody_release_requests_pending_idx
    on public.custody_release_requests (status)
    where status = 'PENDING';

create index if not exists custody_release_requests_holding_idx
    on public.custody_release_requests (holding_id);

alter table public.custody_release_requests enable row level security;

create policy custody_release_requests_select_member
on public.custody_release_requests
for select
to authenticated
using (
    public.is_platform_admin()
    or public.user_organisation_role(organisation_id) is not null
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.order_is_qld_lease(p_order public.orders)
returns boolean
language sql
stable
set search_path = public
as $$
    select p_order.offering = 'LEASE'
      and exists (
          select 1
          from public.quota_holdings as holdings
          join public.fisheries as fisheries
            on fisheries.id = holdings.fishery_id
          join public.jurisdictions as jurisdictions
            on jurisdictions.id = fisheries.jurisdiction_id
          where holdings.id = p_order.holding_id
            and jurisdictions.code = 'QLD'
      );
$$;

create or replace function public.holding_allows_marketplace_offering(
    p_holding public.quota_holdings,
    p_offering text
)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
    v_jurisdiction text;
begin
    if p_holding.verification_status <> 'VERIFIED' then
        raise exception 'Holding must be verified before listing';
    end if;

    select jurisdictions.code
    into v_jurisdiction
    from public.fisheries as fisheries
    join public.jurisdictions as jurisdictions
      on jurisdictions.id = fisheries.jurisdiction_id
    where fisheries.id = p_holding.fishery_id;

    if p_holding.custody_kind = 'FQX_CUSTODIAL' then
        if v_jurisdiction is distinct from 'QLD' then
            raise exception 'Custodial holdings are only supported for Queensland';
        end if;
        if p_offering <> 'LEASE' then
            raise exception 'Custodial quota can only be listed for lease';
        end if;
        return;
    end if;

    if p_offering = 'LEASE' and v_jurisdiction = 'QLD' then
        raise exception 'Queensland leases require FQX custodial quota. Request custodial quota from Holdings first.';
    end if;

    if p_offering = 'SALE' and p_holding.custody_kind = 'FQX_CUSTODIAL' then
        raise exception 'Custodial quota cannot be listed for sale';
    end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_quota_holding: MEMBER only; uniqueness ignores custodial + cancelled
-- ---------------------------------------------------------------------------

create or replace function public.create_quota_holding(
    p_organisation_id bigint,
    p_fishery_id bigint,
    p_quantity numeric,
    p_note text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding_id bigint;
    v_role text;
    v_status text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    v_role := public.user_organisation_role(p_organisation_id);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot create a holding for this organisation';
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    if not exists (select 1 from public.fisheries where id = p_fishery_id) then
        raise exception 'Fishery is required';
    end if;

    if exists (
        select 1
        from public.quota_holdings
        where organisation_id = p_organisation_id
          and fishery_id = p_fishery_id
          and custody_kind = 'MEMBER'
          and verification_status <> 'CANCELLED'
    ) then
        raise exception 'A holding already exists for this fishery. Update the existing holding.';
    end if;

    v_status := public.holding_status_for_actor();

    insert into public.quota_holdings (
        organisation_id,
        fishery_id,
        quantity,
        custody_kind,
        verification_status,
        verified_at,
        verified_by_email
    )
    values (
        p_organisation_id,
        p_fishery_id,
        p_quantity,
        'MEMBER',
        v_status,
        case when v_status = 'VERIFIED' then now() else null end,
        case when v_status = 'VERIFIED' then public.current_user_email() else null end
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
        p_quantity,
        p_quantity,
        nullif(trim(p_note), ''),
        public.current_user_email()
    );

    return v_holding_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Request custodial inbound holding (QLD only)
-- ---------------------------------------------------------------------------

create or replace function public.create_custodial_holding(
    p_organisation_id bigint,
    p_fishery_id bigint,
    p_quantity numeric,
    p_note text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding_id bigint;
    v_role text;
    v_jurisdiction text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    v_role := public.user_organisation_role(p_organisation_id);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot create a custodial holding for this organisation';
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    select jurisdictions.code
    into v_jurisdiction
    from public.fisheries as fisheries
    join public.jurisdictions as jurisdictions
      on jurisdictions.id = fisheries.jurisdiction_id
    where fisheries.id = p_fishery_id;

    if v_jurisdiction is distinct from 'QLD' then
        raise exception 'Custodial quota is only available for Queensland fisheries';
    end if;

    if exists (
        select 1
        from public.quota_holdings
        where organisation_id = p_organisation_id
          and fishery_id = p_fishery_id
          and custody_kind = 'FQX_CUSTODIAL'
          and verification_status <> 'CANCELLED'
    ) then
        raise exception 'A custodial holding already exists for this fishery. Request a release or list from that holding.';
    end if;

    insert into public.quota_holdings (
        organisation_id,
        fishery_id,
        quantity,
        custody_kind,
        verification_status
    )
    values (
        p_organisation_id,
        p_fishery_id,
        p_quantity,
        'FQX_CUSTODIAL',
        'PENDING_VERIFICATION'
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
        'CUSTODY_INBOUND_REQUESTED',
        p_quantity,
        p_quantity,
        coalesce(
            nullif(trim(p_note), ''),
            'Temporary FishNet transfer to FQX custody requested'
        ),
        public.current_user_email()
    );

    perform public.write_audit_event(
        'CUSTODY_INBOUND_REQUESTED',
        'holding',
        v_holding_id,
        jsonb_build_object(
            'organisation_id', p_organisation_id,
            'fishery_id', p_fishery_id,
            'quantity', p_quantity
        ),
        p_organisation_id
    );

    return v_holding_id;
end;
$$;

revoke all on function public.create_custodial_holding(bigint, bigint, numeric, text) from public;
grant execute on function public.create_custodial_holding(bigint, bigint, numeric, text) to authenticated;

create or replace function public.cancel_custodial_holding(p_holding_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_committed numeric;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = p_holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    if v_holding.custody_kind <> 'FQX_CUSTODIAL' then
        raise exception 'Only custodial holdings can be cancelled this way';
    end if;

    if v_holding.verification_status <> 'PENDING_VERIFICATION' then
        raise exception 'Only pending custodial holdings can be cancelled';
    end if;

    v_committed := public.holding_committed_quantity(p_holding_id);
    if v_committed > 0 then
        raise exception 'Cannot cancel a holding with open listings or reservations';
    end if;

    update public.quota_holdings
    set
        verification_status = 'CANCELLED',
        quantity = 0,
        verification_checklist = '[]'::jsonb
    where id = p_holding_id;

    insert into public.quota_ledger (
        holding_id,
        event_type,
        quantity_delta,
        quantity_after,
        note,
        created_by_email
    )
    values (
        p_holding_id,
        'CUSTODY_INBOUND_CANCELLED',
        -v_holding.quantity,
        0,
        'Pending custodial inbound cancelled (FishNet transfer not received)',
        public.current_user_email()
    );

    perform public.write_audit_event(
        'CUSTODY_INBOUND_CANCELLED',
        'holding',
        p_holding_id,
        jsonb_build_object('quantity', v_holding.quantity),
        v_holding.organisation_id
    );
end;
$$;

revoke all on function public.cancel_custodial_holding(bigint) from public;
grant execute on function public.cancel_custodial_holding(bigint) to authenticated;

create or replace function public.verify_quota_holding(p_holding_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = p_holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    if v_holding.verification_status = 'CANCELLED' then
        raise exception 'Cancelled holdings cannot be verified';
    end if;

    update public.quota_holdings
    set
        verification_status = 'VERIFIED',
        verified_at = now(),
        verified_by_email = public.current_user_email()
    where id = p_holding_id;

    if v_holding.custody_kind = 'FQX_CUSTODIAL' then
        perform public.write_audit_event(
            'CUSTODY_INBOUND_VERIFIED',
            'holding',
            p_holding_id,
            jsonb_build_object('quantity', v_holding.quantity),
            v_holding.organisation_id
        );
    end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Release custody back to member
-- ---------------------------------------------------------------------------

create or replace function public.request_custody_release(
    p_holding_id bigint,
    p_quantity numeric
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_committed numeric;
    v_pending_release numeric;
    v_id bigint;
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

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot request a custody release for this organisation';
    end if;

    if v_holding.custody_kind <> 'FQX_CUSTODIAL'
       or v_holding.verification_status <> 'VERIFIED' then
        raise exception 'Release is only available on verified custodial holdings';
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    v_committed := public.holding_committed_quantity(p_holding_id);
    v_pending_release := coalesce((
        select sum(r.quantity)
        from public.custody_release_requests as r
        where r.holding_id = p_holding_id
          and r.status = 'PENDING'
    ), 0);

    if p_quantity > v_holding.quantity - v_committed - v_pending_release then
        raise exception 'Quantity exceeds available custodial quota';
    end if;

    insert into public.custody_release_requests (
        organisation_id,
        holding_id,
        quantity,
        status,
        created_by_email
    )
    values (
        v_holding.organisation_id,
        p_holding_id,
        p_quantity,
        'PENDING',
        public.current_user_email()
    )
    returning id into v_id;

    perform public.write_audit_event(
        'CUSTODY_RELEASE_REQUESTED',
        'holding',
        p_holding_id,
        jsonb_build_object(
            'release_request_id', v_id,
            'quantity', p_quantity
        ),
        v_holding.organisation_id
    );

    return v_id;
end;
$$;

revoke all on function public.request_custody_release(bigint, numeric) from public;
grant execute on function public.request_custody_release(bigint, numeric) to authenticated;

create or replace function public.cancel_custody_release(p_request_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_request public.custody_release_requests%rowtype;
    v_role text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_request
    from public.custody_release_requests
    where id = p_request_id
    for update;

    if not found then
        raise exception 'Release request not found';
    end if;

    if v_request.status <> 'PENDING' then
        raise exception 'Only pending release requests can be cancelled';
    end if;

    v_role := public.user_organisation_role(v_request.organisation_id);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot cancel this release request';
    end if;

    update public.custody_release_requests
    set
        status = 'CANCELLED',
        cancelled_at = now()
    where id = p_request_id;

    perform public.write_audit_event(
        'CUSTODY_RELEASE_CANCELLED',
        'holding',
        v_request.holding_id,
        jsonb_build_object(
            'release_request_id', p_request_id,
            'quantity', v_request.quantity
        ),
        v_request.organisation_id
    );
end;
$$;

revoke all on function public.cancel_custody_release(bigint) from public;
grant execute on function public.cancel_custody_release(bigint) to authenticated;

create or replace function public.complete_custody_release(
    p_request_id bigint,
    p_fishnet_reference text default null,
    p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_request public.custody_release_requests%rowtype;
    v_custodial public.quota_holdings%rowtype;
    v_member public.quota_holdings%rowtype;
    v_committed numeric;
    v_available numeric;
    v_member_after numeric;
    v_custodial_after numeric;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select * into v_request
    from public.custody_release_requests
    where id = p_request_id
    for update;

    if not found then
        raise exception 'Release request not found';
    end if;

    if v_request.status <> 'PENDING' then
        raise exception 'Release request is not pending';
    end if;

    select * into v_custodial
    from public.quota_holdings
    where id = v_request.holding_id
    for update;

    if v_custodial.custody_kind <> 'FQX_CUSTODIAL'
       or v_custodial.verification_status <> 'VERIFIED' then
        raise exception 'Custodial holding is not available for release';
    end if;

    v_committed := public.holding_committed_quantity(v_custodial.id);
    v_available := v_custodial.quantity - v_committed;
    if v_request.quantity > v_available then
        raise exception 'Quantity exceeds available custodial quota';
    end if;

    v_custodial_after := v_custodial.quantity - v_request.quantity;
    update public.quota_holdings
    set quantity = v_custodial_after
    where id = v_custodial.id;

    insert into public.quota_ledger (
        holding_id,
        event_type,
        quantity_delta,
        quantity_after,
        note,
        created_by_email
    )
    values (
        v_custodial.id,
        'CUSTODY_RELEASE_OUT',
        -v_request.quantity,
        v_custodial_after,
        coalesce(
            nullif(trim(p_fishnet_reference), ''),
            'FishNet instant transfer back to member'
        ),
        public.current_user_email()
    );

    select * into v_member
    from public.quota_holdings
    where organisation_id = v_custodial.organisation_id
      and fishery_id = v_custodial.fishery_id
      and custody_kind = 'MEMBER'
      and verification_status <> 'CANCELLED'
    for update;

    if not found then
        insert into public.quota_holdings (
            organisation_id,
            fishery_id,
            quantity,
            custody_kind,
            verification_status,
            verified_at,
            verified_by_email
        )
        values (
            v_custodial.organisation_id,
            v_custodial.fishery_id,
            0,
            'MEMBER',
            'VERIFIED',
            now(),
            public.current_user_email()
        )
        returning * into v_member;
    end if;

    v_member_after := v_member.quantity + v_request.quantity;
    update public.quota_holdings
    set quantity = v_member_after
    where id = v_member.id;

    insert into public.quota_ledger (
        holding_id,
        event_type,
        quantity_delta,
        quantity_after,
        note,
        created_by_email
    )
    values (
        v_member.id,
        'CUSTODY_RELEASE_IN',
        v_request.quantity,
        v_member_after,
        coalesce(
            nullif(trim(p_fishnet_reference), ''),
            'Returned from FQX temporary custody'
        ),
        public.current_user_email()
    );

    update public.custody_release_requests
    set
        status = 'COMPLETED',
        completed_at = now(),
        completed_by_email = public.current_user_email(),
        fishnet_reference = nullif(trim(p_fishnet_reference), ''),
        admin_notes = nullif(trim(p_admin_notes), '')
    where id = p_request_id;

    perform public.write_audit_event(
        'CUSTODY_RELEASE_COMPLETED',
        'holding',
        v_custodial.id,
        jsonb_build_object(
            'release_request_id', p_request_id,
            'quantity', v_request.quantity,
            'member_holding_id', v_member.id,
            'fishnet_reference', nullif(trim(p_fishnet_reference), '')
        ),
        v_custodial.organisation_id
    );
end;
$$;

revoke all on function public.complete_custody_release(bigint, text, text) from public;
grant execute on function public.complete_custody_release(bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Listing / auction custody gates
-- ---------------------------------------------------------------------------

create or replace function public.create_listing(
    p_holding_id bigint,
    p_offering text,
    p_quantity numeric,
    p_unit_price_aud numeric,
    p_expires_at timestamptz,
    p_unused_quantity numeric default null,
    p_used_quantity numeric default null
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
    v_unused numeric;
    v_used numeric;
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

    perform public.holding_allows_marketplace_offering(v_holding, p_offering);

    if not coalesce(
        public.fishery_allows_offering(v_holding.fishery_id, p_offering),
        false
    ) then
        raise exception 'This fishery cannot be listed for %', lower(p_offering);
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    select usage.unused_quantity, usage.used_quantity
    into v_unused, v_used
    from public.qld_quota_usage(
        p_holding_id,
        p_quantity,
        p_unused_quantity,
        p_used_quantity
    ) as usage;

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
        created_by_email
    )
    values (
        v_holding.organisation_id,
        p_holding_id,
        'FIXED_PRICE',
        p_offering,
        p_quantity,
        v_unused,
        v_used,
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
    p_ends_at timestamptz,
    p_unused_quantity numeric default null,
    p_used_quantity numeric default null
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
    v_unused numeric;
    v_used numeric;
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

    perform public.holding_allows_marketplace_offering(v_holding, p_offering);

    if not coalesce(
        public.fishery_allows_offering(v_holding.fishery_id, p_offering),
        false
    ) then
        raise exception 'This fishery cannot be listed for %', lower(p_offering);
    end if;

    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
    end if;

    select usage.unused_quantity, usage.used_quantity
    into v_unused, v_used
    from public.qld_quota_usage(
        p_holding_id,
        p_quantity,
        p_unused_quantity,
        p_used_quantity
    ) as usage;

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
        unused_quantity,
        used_quantity,
        unit_price_aud,
        starting_price_aud,
        bid_increment_aud,
        reserve_price_aud,
        starts_at,
        ends_at,
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
        'AUCTION',
        p_offering,
        p_quantity,
        v_unused,
        v_used,
        p_starting_price_aud,
        p_starting_price_aud,
        p_bid_increment_aud,
        p_reserve_price_aud,
        v_starts,
        p_ends_at,
        p_ends_at,
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

-- ---------------------------------------------------------------------------
-- Orders without Stripe payment: QLD lease → AWAITING_TRANSFER
-- ---------------------------------------------------------------------------

create or replace function public.insert_simulated_order(
    p_listing_id bigint,
    p_buyer_organisation_id bigint,
    p_unit_price_aud numeric
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_listing public.listings%rowtype;
    v_holding public.quota_holdings%rowtype;
    v_buyer_name text;
    v_available numeric;
    v_amount numeric;
    v_order_id bigint;
    v_status text;
    v_charges boolean;
    v_is_qld_lease boolean;
begin
    select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

    if not found then
        raise exception 'Listing not found';
    end if;

    if v_listing.status <> 'PUBLISHED' then
        raise exception 'Listing is not available';
    end if;

    if p_buyer_organisation_id = v_listing.organisation_id then
        raise exception 'Buyer and seller must be different organisations';
    end if;

    if p_unit_price_aud is null or p_unit_price_aud <= 0 then
        raise exception 'Price must be greater than zero';
    end if;

    select legal_name into v_buyer_name
    from public.organisations
    where id = p_buyer_organisation_id;

    if v_buyer_name is null then
        raise exception 'Organisation not found';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = v_listing.holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_available := v_holding.quantity - coalesce((
        select sum(r.quantity)
        from public.quota_reservations as r
        where r.holding_id = v_holding.id
          and r.status = 'ACTIVE'
    ), 0);

    if v_listing.quantity > v_available then
        raise exception 'Quota is no longer available';
    end if;

    v_amount := round(v_listing.quantity * p_unit_price_aud, 2);

    if v_amount is null or v_amount <= 0 then
        raise exception 'Order amount must be greater than zero';
    end if;

    select organisations.stripe_charges_enabled
    into v_charges
    from public.organisations as organisations
    where organisations.id = v_listing.organisation_id;

    v_is_qld_lease := v_listing.offering = 'LEASE'
      and exists (
          select 1
          from public.fisheries as fisheries
          join public.jurisdictions as jurisdictions
            on jurisdictions.id = fisheries.jurisdiction_id
          where fisheries.id = v_holding.fishery_id
            and jurisdictions.code = 'QLD'
      );

    v_status := case
        when coalesce(v_charges, false) then 'AWAITING_PAYMENT'
        when v_is_qld_lease then 'AWAITING_TRANSFER'
        else 'AWAITING_COMPLIANCE'
    end;

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
        created_by_email
    )
    values (
        v_listing.id,
        v_listing.holding_id,
        v_listing.organisation_id,
        p_buyer_organisation_id,
        v_listing.offering,
        v_listing.quantity,
        p_unit_price_aud,
        v_amount,
        v_status,
        v_listing.seller_name,
        v_buyer_name,
        v_listing.fishery_name,
        v_listing.quota_type_name,
        v_listing.measurement_kind,
        v_listing.unit_label,
        public.current_user_email()
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
        v_listing.id,
        v_listing.holding_id,
        v_listing.quantity,
        'ACTIVE'
    );

    insert into public.transactions (
        order_id,
        status,
        amount_aud
    )
    values (
        v_order_id,
        'PENDING',
        v_amount
    );

    update public.listings
    set
        status = 'RESERVED',
        unit_price_aud = p_unit_price_aud
    where id = v_listing.id;

    perform public.write_audit_event(
        'ORDER_CREATED',
        'order',
        v_order_id,
        jsonb_build_object(
            'listing_id', v_listing.id,
            'quantity', v_listing.quantity,
            'status', v_status
        )
    );

    perform public.write_audit_event(
        'QUOTA_RESERVED',
        'order',
        v_order_id,
        jsonb_build_object(
            'holding_id', v_listing.holding_id,
            'quantity', v_listing.quantity
        )
    );

    return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment: QLD lease skips compliance → AWAITING_TRANSFER
-- ---------------------------------------------------------------------------

create or replace function public.mark_order_paid(
    p_order_id bigint,
    p_checkout_session_id text,
    p_payment_intent_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
    v_next_status text;
begin
    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status in ('AWAITING_COMPLIANCE', 'AWAITING_TRANSFER')
       and exists (
           select 1
           from public.payments
           where order_id = p_order_id
             and status = 'PAID'
       ) then
        return;
    end if;

    if v_order.status <> 'AWAITING_PAYMENT' then
        raise exception 'Order is not waiting for payment';
    end if;

    if public.order_is_qld_lease(v_order) then
        v_next_status := 'AWAITING_TRANSFER';
    else
        v_next_status := 'AWAITING_COMPLIANCE';
    end if;

    update public.orders
    set status = v_next_status
    where id = p_order_id;

    insert into public.payments (
        order_id,
        checkout_session_id,
        payment_intent_id,
        status,
        amount_aud,
        fee_amount_aud
    )
    values (
        p_order_id,
        nullif(trim(p_checkout_session_id), ''),
        nullif(trim(p_payment_intent_id), ''),
        'PAID',
        v_order.amount_aud,
        v_order.fee_amount_aud
    )
    on conflict (order_id) do update
    set
        checkout_session_id = coalesce(
            excluded.checkout_session_id,
            public.payments.checkout_session_id
        ),
        payment_intent_id = coalesce(
            excluded.payment_intent_id,
            public.payments.payment_intent_id
        ),
        status = 'PAID';

    perform public.write_audit_event(
        'PAYMENT_RECEIVED',
        'order',
        p_order_id,
        jsonb_build_object(
            'provider', 'stripe',
            'checkout_session_id', nullif(trim(p_checkout_session_id), ''),
            'payment_intent_id', nullif(trim(p_payment_intent_id), ''),
            'next_status', v_next_status
        )
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- Lease outbound checklist + complete (transfer + settlement)
-- ---------------------------------------------------------------------------

create or replace function public.save_lease_outbound_checklist(
    p_order_id bigint,
    p_completed text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status <> 'AWAITING_TRANSFER'
       or not public.order_is_qld_lease(v_order) then
        raise exception 'Order is not waiting for Queensland lease outbound transfer';
    end if;

    update public.orders
    set lease_outbound_checklist = to_jsonb(coalesce(p_completed, '{}'::text[]))
    where id = p_order_id;

    perform public.write_audit_event(
        'LEASE_OUTBOUND_CHECK_SAVED',
        'order',
        p_order_id,
        jsonb_build_object('completed', coalesce(p_completed, '{}'::text[]))
    );
end;
$$;

revoke all on function public.save_lease_outbound_checklist(bigint, text[]) from public;
grant execute on function public.save_lease_outbound_checklist(bigint, text[]) to authenticated;

create or replace function public.complete_lease_outbound(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status <> 'AWAITING_TRANSFER'
       or not public.order_is_qld_lease(v_order) then
        raise exception 'Order is not waiting for Queensland lease outbound transfer';
    end if;

    perform public.write_audit_event(
        'LEASE_OUTBOUND_COMPLETED',
        'order',
        p_order_id,
        jsonb_build_object('checklist', v_order.lease_outbound_checklist)
    );

    perform public.simulate_transfer(p_order_id);
    perform public.simulate_settlement(p_order_id);
end;
$$;

revoke all on function public.complete_lease_outbound(bigint) from public;
grant execute on function public.complete_lease_outbound(bigint) to authenticated;

-- Buyer holding on settlement must be MEMBER (not custodial)
create or replace function public.simulate_settlement(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
    v_listing public.listings%rowtype;
    v_seller_holding public.quota_holdings%rowtype;
    v_buyer_holding public.quota_holdings%rowtype;
    v_reservation public.quota_reservations%rowtype;
    v_seller_event text;
    v_buyer_event text;
    v_note text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status <> 'AWAITING_SETTLEMENT' then
        raise exception 'Order is not waiting for settlement';
    end if;

    select * into v_listing
    from public.listings
    where id = v_order.listing_id
    for update;

    if v_listing.status <> 'RESERVED' then
        raise exception 'Listing is not reserved';
    end if;

    select * into v_reservation
    from public.quota_reservations
    where order_id = p_order_id
    for update;

    if v_reservation.status <> 'ACTIVE' then
        raise exception 'Quota reservation is not active';
    end if;

    select * into v_seller_holding
    from public.quota_holdings
    where id = v_order.holding_id
    for update;

    if v_order.offering = 'LEASE' then
        v_seller_event := 'LEASE_OUT';
        v_buyer_event := 'LEASE_IN';
    else
        v_seller_event := 'SALE';
        v_buyer_event := 'PURCHASE';
    end if;

    v_note := 'Order ' || p_order_id::text;

    perform public.apply_quota_event(
        v_seller_holding.id,
        v_seller_event,
        -v_order.quantity,
        v_note
    );

    select * into v_buyer_holding
    from public.quota_holdings
    where organisation_id = v_order.buyer_organisation_id
      and fishery_id = v_seller_holding.fishery_id
      and custody_kind = 'MEMBER'
      and verification_status <> 'CANCELLED'
    for update;

    if not found then
        insert into public.quota_holdings (
            organisation_id,
            fishery_id,
            quantity,
            custody_kind,
            verification_status,
            verified_at,
            verified_by_email
        )
        values (
            v_order.buyer_organisation_id,
            v_seller_holding.fishery_id,
            0,
            'MEMBER',
            'VERIFIED',
            now(),
            public.current_user_email()
        )
        returning * into v_buyer_holding;
    end if;

    perform public.apply_quota_event(
        v_buyer_holding.id,
        v_buyer_event,
        v_order.quantity,
        v_note
    );

    update public.quota_reservations
    set
        status = 'CONSUMED',
        released_at = now()
    where id = v_reservation.id
      and status = 'ACTIVE';

    update public.listings
    set status = 'SOLD'
    where id = v_listing.id
      and status = 'RESERVED';

    update public.orders
    set status = 'COMPLETED'
    where id = p_order_id;

    update public.transactions
    set
        status = 'COMPLETED',
        completed_at = now()
    where order_id = p_order_id
      and status = 'PENDING';

    perform public.write_audit_event(
        'SETTLEMENT_SIMULATED',
        'order',
        p_order_id,
        jsonb_build_object(
            'seller_holding_id', v_seller_holding.id,
            'buyer_holding_id', v_buyer_holding.id,
            'seller_event', v_seller_event,
            'buyer_event', v_buyer_event,
            'quantity', v_order.quantity
        )
    );
end;
$$;

create or replace function public.admin_action_counts()
returns table (
    holdings integer,
    listings integer,
    orders integer,
    custody_releases integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    return query
    select
        (
            select count(*)::integer
            from public.quota_holdings
            where verification_status = 'PENDING_VERIFICATION'
        ) as holdings,
        (
            select count(*)::integer
            from public.listings
            where status = 'PENDING_APPROVAL'
        ) as listings,
        (
            select count(*)::integer
            from public.orders
            where status in (
                'AWAITING_COMPLIANCE',
                'AWAITING_TRANSFER',
                'AWAITING_SETTLEMENT'
            )
        ) as orders,
        (
            select count(*)::integer
            from public.custody_release_requests
            where status = 'PENDING'
        ) as custody_releases;
end;
$$;

-- Retire open QLD lease listings that are not on custodial holdings.
update public.listings as listings
set
    status = 'CANCELLED',
    review_note = coalesce(
        nullif(trim(listings.review_note), ''),
        'Cancelled: Queensland leases now require FQX custodial quota (Phase 12).'
    )
from public.quota_holdings as holdings
join public.fisheries as fisheries
  on fisheries.id = holdings.fishery_id
join public.jurisdictions as jurisdictions
  on jurisdictions.id = fisheries.jurisdiction_id
where holdings.id = listings.holding_id
  and listings.offering = 'LEASE'
  and listings.status in ('PENDING_APPROVAL', 'PUBLISHED')
  and jurisdictions.code = 'QLD'
  and holdings.custody_kind is distinct from 'FQX_CUSTODIAL';

notify pgrst, 'reload schema';

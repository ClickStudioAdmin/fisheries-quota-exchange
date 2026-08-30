-- Members can create and adjust holdings. Unverified users need admin
-- approval before a holding can be listed or auctioned. Verified users skip
-- that check. Quantity changes still go through the immutable ledger.

create table public.verified_users (
    email text primary key,
    created_at timestamptz not null default now(),
    verified_by_email text
);

create function public.verified_users_lowercase_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.email := lower(trim(new.email));
    return new;
end;
$$;

create trigger verified_users_lowercase_email
before insert or update of email on public.verified_users
for each row
execute function public.verified_users_lowercase_email();

alter table public.verified_users enable row level security;

create policy verified_users_select
on public.verified_users
for select
to authenticated
using (
    public.is_platform_admin()
    or email = public.current_user_email()
);

create policy verified_users_write
on public.verified_users
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create function public.is_verified_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.verified_users as verified
        where verified.email = public.current_user_email()
    )
$$;

revoke all on function public.is_verified_user() from public;
grant execute on function public.is_verified_user() to authenticated;

create function public.holding_status_for_actor()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select case
        when public.is_platform_admin() or public.is_verified_user() then 'VERIFIED'
        else 'PENDING_VERIFICATION'
    end
$$;

revoke all on function public.holding_status_for_actor() from public;
grant execute on function public.holding_status_for_actor() to authenticated;

create policy organisation_users_admin_select
on public.organisation_users
for select
to authenticated
using (public.is_platform_admin());

alter table public.quota_holdings
    add column verification_status text not null default 'PENDING_VERIFICATION',
    add column verified_at timestamptz,
    add column verified_by_email text;

alter table public.quota_holdings
    add constraint quota_holdings_verification_status_check
        check (verification_status in ('PENDING_VERIFICATION', 'VERIFIED'));

update public.quota_holdings
set
    verification_status = 'VERIFIED',
    verified_at = created_at
where verification_status = 'PENDING_VERIFICATION';

create or replace function public.create_quota_holding(
    p_organisation_id bigint,
    p_stock_id bigint,
    p_season_id bigint,
    p_quota_type_id bigint,
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
    v_fishery_id bigint;
    v_season_fishery_id bigint;
    v_type_fishery_id bigint;
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

    select fishery_id into v_fishery_id
    from public.stocks
    where id = p_stock_id;

    select fishery_id into v_season_fishery_id
    from public.seasons
    where id = p_season_id;

    select fishery_id into v_type_fishery_id
    from public.quota_types
    where id = p_quota_type_id;

    if v_fishery_id is null or v_season_fishery_id is null or v_type_fishery_id is null then
        raise exception 'Stock, season and quota type are required';
    end if;

    if v_fishery_id <> v_season_fishery_id or v_fishery_id <> v_type_fishery_id then
        raise exception 'Stock, season and quota type must belong to the same fishery';
    end if;

    v_status := public.holding_status_for_actor();

    insert into public.quota_holdings (
        organisation_id,
        stock_id,
        season_id,
        quota_type_id,
        quantity,
        verification_status,
        verified_at,
        verified_by_email
    )
    values (
        p_organisation_id,
        p_stock_id,
        p_season_id,
        p_quota_type_id,
        p_quantity,
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

create function public.adjust_quota_holding(
    p_holding_id bigint,
    p_quantity numeric,
    p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_reserved numeric;
    v_status text;
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
        raise exception 'You cannot update this holding';
    end if;

    if p_quantity is null or p_quantity < 0 then
        raise exception 'Quantity cannot be negative';
    end if;

    if p_quantity = v_holding.quantity then
        raise exception 'Quantity is unchanged';
    end if;

    v_reserved := coalesce((
        select sum(reservations.quantity)
        from public.quota_reservations as reservations
        where reservations.holding_id = p_holding_id
          and reservations.status = 'ACTIVE'
    ), 0);

    if p_quantity < v_reserved then
        raise exception 'Quantity cannot be below reserved quota';
    end if;

    perform public.apply_quota_event(
        p_holding_id,
        'ADJUSTMENT',
        p_quantity - v_holding.quantity,
        p_note
    );

    v_status := public.holding_status_for_actor();

    update public.quota_holdings
    set
        verification_status = v_status,
        verified_at = case when v_status = 'VERIFIED' then now() else null end,
        verified_by_email = case
            when v_status = 'VERIFIED' then public.current_user_email()
            else null
        end
    where id = p_holding_id;
end;
$$;

revoke all on function public.adjust_quota_holding(bigint, numeric, text) from public;
grant execute on function public.adjust_quota_holding(bigint, numeric, text) to authenticated;

create function public.verify_quota_holding(p_holding_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    update public.quota_holdings
    set
        verification_status = 'VERIFIED',
        verified_at = now(),
        verified_by_email = public.current_user_email()
    where id = p_holding_id;

    if not found then
        raise exception 'Holding not found';
    end if;
end;
$$;

revoke all on function public.verify_quota_holding(bigint) from public;
grant execute on function public.verify_quota_holding(bigint) to authenticated;

create function public.set_user_verified(p_email text, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    v_email := lower(trim(p_email));

    if v_email is null or v_email = '' or position('@' in v_email) = 0 then
        raise exception 'Enter a valid email address';
    end if;

    if coalesce(p_verified, false) then
        insert into public.verified_users (email, verified_by_email)
        values (v_email, public.current_user_email())
        on conflict (email) do nothing;
    else
        delete from public.verified_users
        where email = v_email;
    end if;
end;
$$;

revoke all on function public.set_user_verified(text, boolean) from public;
grant execute on function public.set_user_verified(text, boolean) to authenticated;

create function public.enforce_listing_holding_verified()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_status text;
begin
    select verification_status into v_status
    from public.quota_holdings
    where id = new.holding_id;

    if v_status is distinct from 'VERIFIED' then
        raise exception 'Holding must be verified before it can be listed';
    end if;

    return new;
end;
$$;

create trigger listings_holding_verified
before insert on public.listings
for each row
execute function public.enforce_listing_holding_verified();

-- Singleton platform settings. Fees are recorded on simulated orders; there
-- is no live payment. Auto-approve applies to verified_users only.

create table public.platform_settings (
    id integer primary key default 1,
    sale_fee_percent numeric(5, 2) not null default 0,
    lease_fee_percent numeric(5, 2) not null default 0,
    allow_registrations boolean not null default true,
    auto_approve_holdings boolean not null default true,
    auto_approve_listings boolean not null default false,
    updated_at timestamptz not null default now(),
    updated_by_email text,
    constraint platform_settings_singleton check (id = 1),
    constraint platform_settings_sale_fee_check
        check (sale_fee_percent >= 0 and sale_fee_percent <= 100),
    constraint platform_settings_lease_fee_check
        check (lease_fee_percent >= 0 and lease_fee_percent <= 100)
);

insert into public.platform_settings (id) values (1);

create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row
execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

grant select on public.platform_settings to anon, authenticated;

create policy platform_settings_select
on public.platform_settings
for select
to anon, authenticated
using (true);

alter table public.orders
    add column fee_percent numeric(5, 2) not null default 0,
    add column fee_amount_aud numeric(18, 2) not null default 0;

alter table public.orders
    add constraint orders_fee_percent_check
        check (fee_percent >= 0 and fee_percent <= 100),
    add constraint orders_fee_amount_check
        check (fee_amount_aud >= 0);

create or replace function public.holding_status_for_actor()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select case
        when public.is_verified_user()
             and coalesce(
                 (select auto_approve_holdings from public.platform_settings where id = 1),
                 true
             )
            then 'VERIFIED'
        else 'PENDING_VERIFICATION'
    end
$$;

create function public.listing_initial_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select case
        when public.is_verified_user()
             and coalesce(
                 (select auto_approve_listings from public.platform_settings where id = 1),
                 false
             )
            then 'PUBLISHED'
        else 'PENDING_APPROVAL'
    end
$$;

revoke all on function public.listing_initial_status() from public;
grant execute on function public.listing_initial_status() to authenticated;

create function public.apply_listing_auto_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.status = 'PENDING_APPROVAL'
       and public.listing_initial_status() = 'PUBLISHED' then
        new.status := 'PUBLISHED';
        new.reviewed_at := now();
        new.reviewed_by_email := public.current_user_email();
        if new.review_note is null then
            new.review_note := 'Auto-approved';
        end if;
    end if;

    return new;
end;
$$;

create trigger listings_auto_approve
before insert on public.listings
for each row
execute function public.apply_listing_auto_approval();

create function public.platform_fee_percent(p_offering text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        case
            when p_offering = 'LEASE' then (
                select lease_fee_percent
                from public.platform_settings
                where id = 1
            )
            else (
                select sale_fee_percent
                from public.platform_settings
                where id = 1
            )
        end,
        0
    )
$$;

revoke all on function public.platform_fee_percent(text) from public;
grant execute on function public.platform_fee_percent(text) to authenticated;

create function public.apply_order_platform_fee()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.fee_percent := public.platform_fee_percent(new.offering);
    new.fee_amount_aud := round(new.amount_aud * new.fee_percent / 100.0, 2);
    return new;
end;
$$;

create trigger orders_apply_platform_fee
before insert on public.orders
for each row
execute function public.apply_order_platform_fee();

create function public.registrations_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        (select allow_registrations from public.platform_settings where id = 1),
        true
    )
$$;

revoke all on function public.registrations_allowed() from public;
grant execute on function public.registrations_allowed() to anon, authenticated;

create function public.update_platform_settings(
    p_sale_fee_percent numeric,
    p_lease_fee_percent numeric,
    p_allow_registrations boolean,
    p_auto_approve_holdings boolean,
    p_auto_approve_listings boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    if p_sale_fee_percent is null
       or p_sale_fee_percent < 0
       or p_sale_fee_percent > 100 then
        raise exception 'Sale fee must be between 0 and 100';
    end if;

    if p_lease_fee_percent is null
       or p_lease_fee_percent < 0
       or p_lease_fee_percent > 100 then
        raise exception 'Lease fee must be between 0 and 100';
    end if;

    update public.platform_settings
    set
        sale_fee_percent = p_sale_fee_percent,
        lease_fee_percent = p_lease_fee_percent,
        allow_registrations = p_allow_registrations,
        auto_approve_holdings = p_auto_approve_holdings,
        auto_approve_listings = p_auto_approve_listings,
        updated_by_email = public.current_user_email()
    where id = 1;
end;
$$;

revoke all on function public.update_platform_settings(numeric, numeric, boolean, boolean, boolean) from public;
grant execute on function public.update_platform_settings(numeric, numeric, boolean, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';

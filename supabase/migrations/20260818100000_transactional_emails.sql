-- Per-template email switches and one-time dispatch keys for scheduled mail.

alter table public.platform_settings
    add column disabled_emails text[] not null default '{}';

create table public.email_dispatches (
    template text not null,
    entity_key text not null,
    sent_at timestamptz not null default now(),
    primary key (template, entity_key)
);

alter table public.email_dispatches enable row level security;

create function public.claim_email_dispatch(
    p_template text,
    p_entity_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    inserted integer;
begin
    insert into public.email_dispatches (template, entity_key)
    values (p_template, p_entity_key)
    on conflict (template, entity_key) do nothing;

    get diagnostics inserted = row_count;
    return inserted > 0;
end;
$$;

revoke all on function public.claim_email_dispatch(text, text) from public;
grant execute on function public.claim_email_dispatch(text, text) to authenticated, service_role;

drop function if exists public.update_platform_settings(
    numeric,
    numeric,
    boolean,
    boolean,
    boolean
);

create function public.update_platform_settings(
    p_sale_fee_percent numeric,
    p_lease_fee_percent numeric,
    p_allow_registrations boolean,
    p_auto_approve_holdings boolean,
    p_auto_approve_listings boolean,
    p_disabled_emails text[]
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
        disabled_emails = coalesce(p_disabled_emails, '{}'),
        updated_by_email = public.current_user_email()
    where id = 1;
end;
$$;

revoke all on function public.update_platform_settings(
    numeric,
    numeric,
    boolean,
    boolean,
    boolean,
    text[]
) from public;
grant execute on function public.update_platform_settings(
    numeric,
    numeric,
    boolean,
    boolean,
    boolean,
    text[]
) to authenticated;

notify pgrst, 'reload schema';

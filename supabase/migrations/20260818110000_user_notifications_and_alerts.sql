-- Per-user email opt-outs and fishery listing alerts (sale / lease).

create table public.user_email_preferences (
    email text primary key,
    disabled_emails text[] not null default '{}',
    updated_at timestamptz not null default now()
);

create trigger user_email_preferences_set_updated_at
before update on public.user_email_preferences
for each row
execute function public.set_updated_at();

alter table public.user_email_preferences enable row level security;

grant select on public.user_email_preferences to authenticated;

create policy user_email_preferences_select
on public.user_email_preferences
for select
to authenticated
using (email = public.current_user_email());

create table public.listing_alerts (
    email text not null,
    fishery_id bigint not null references public.fisheries (id) on delete cascade,
    sales boolean not null default false,
    leases boolean not null default false,
    updated_at timestamptz not null default now(),
    primary key (email, fishery_id),
    constraint listing_alerts_kind_check check (sales or leases)
);

create trigger listing_alerts_set_updated_at
before update on public.listing_alerts
for each row
execute function public.set_updated_at();

create index listing_alerts_fishery_id_idx
    on public.listing_alerts (fishery_id);

alter table public.listing_alerts enable row level security;

grant select on public.listing_alerts to authenticated;

create policy listing_alerts_select
on public.listing_alerts
for select
to authenticated
using (email = public.current_user_email());

create function public.update_user_email_preferences(p_disabled_emails text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
begin
    v_email := public.current_user_email();

    if v_email is null or v_email = '' then
        raise exception 'Not authenticated';
    end if;

    insert into public.user_email_preferences (email, disabled_emails)
    values (v_email, coalesce(p_disabled_emails, '{}'))
    on conflict (email) do update
        set disabled_emails = excluded.disabled_emails;
end;
$$;

revoke all on function public.update_user_email_preferences(text[]) from public;
grant execute on function public.update_user_email_preferences(text[]) to authenticated;

create function public.replace_listing_alerts(
    p_sales bigint[],
    p_leases bigint[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
begin
    v_email := public.current_user_email();

    if v_email is null or v_email = '' then
        raise exception 'Not authenticated';
    end if;

    delete from public.listing_alerts
    where email = v_email;

    insert into public.listing_alerts (email, fishery_id, sales, leases)
    select
        v_email,
        fisheries.id,
        fisheries.id = any(coalesce(p_sales, '{}')),
        fisheries.id = any(coalesce(p_leases, '{}'))
    from public.fisheries
    where fisheries.id = any(
        coalesce(p_sales, '{}') || coalesce(p_leases, '{}')
    );
end;
$$;

revoke all on function public.replace_listing_alerts(bigint[], bigint[]) from public;
grant execute on function public.replace_listing_alerts(bigint[], bigint[]) to authenticated;

create or replace function public.sync_organisation_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_old text;
    v_new text;
begin
    if new.email is null
       or old.email is null
       or lower(new.email) is not distinct from lower(old.email) then
        return new;
    end if;

    v_old := lower(old.email);
    v_new := lower(new.email);

    update public.organisation_users
    set email = v_new
    where email = v_old;

    if not exists (
        select 1 from public.user_email_preferences where email = v_new
    ) then
        update public.user_email_preferences
        set email = v_new
        where email = v_old;
    else
        delete from public.user_email_preferences
        where email = v_old;
    end if;

    delete from public.listing_alerts as incoming
    using public.listing_alerts as existing
    where incoming.email = v_old
      and existing.email = v_new
      and incoming.fishery_id = existing.fishery_id;

    update public.listing_alerts
    set email = v_new
    where email = v_old;

    return new;
end;
$$;

notify pgrst, 'reload schema';

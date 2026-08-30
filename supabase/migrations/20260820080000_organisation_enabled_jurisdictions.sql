-- Businesses opt into the jurisdictions they trade in. Profile fields for a
-- jurisdiction are required only after it is selected. Queensland is the only
-- selectable code in this phase; the column is a text array so later codes
-- can be added without a new table.

alter table public.organisations
    add column if not exists enabled_jurisdiction_codes text[] not null default '{}'::text[];

alter table public.organisations
    drop constraint if exists organisations_enabled_jurisdiction_codes_items;

alter table public.organisations
    add constraint organisations_enabled_jurisdiction_codes_items
        check (enabled_jurisdiction_codes = array_remove(enabled_jurisdiction_codes, null));

update public.organisations as organisations
set enabled_jurisdiction_codes = array['QLD']::text[]
where exists (
    select 1
    from public.organisation_jurisdiction_profiles as profiles
    join public.jurisdictions as jurisdictions
      on jurisdictions.id = profiles.jurisdiction_id
    where profiles.organisation_id = organisations.id
      and jurisdictions.code = 'QLD'
      and nullif(btrim(coalesce(profiles.client_reference, '')), '') is not null
      and nullif(btrim(coalesce(profiles.licence_number, '')), '') is not null
)
  and not ('QLD' = any (organisations.enabled_jurisdiction_codes));

create or replace function public.organisation_is_trade_ready(
    p_organisation_id bigint,
    p_require_qld boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_org public.organisations%rowtype;
    v_qld_id bigint;
    v_profile public.organisation_jurisdiction_profiles%rowtype;
begin
    select * into v_org
    from public.organisations
    where id = p_organisation_id;

    if not found then
        return false;
    end if;

    if v_org.entity_kind is null then
        return false;
    end if;

    if nullif(btrim(v_org.legal_name), '') is null then
        return false;
    end if;

    if nullif(btrim(coalesce(v_org.abn, '')), '') is null then
        return false;
    end if;

    if v_org.entity_kind = 'COMPANY'
        and nullif(btrim(coalesce(v_org.acn, '')), '') is null then
        return false;
    end if;

    if nullif(btrim(coalesce(v_org.mobile, '')), '') is null then
        return false;
    end if;

    if not public.australian_address_is_complete(v_org.registered_address) then
        return false;
    end if;

    if v_org.postal_same_as_registered is false
        and not public.australian_address_is_complete(v_org.postal_address) then
        return false;
    end if;

    if p_require_qld then
        if not ('QLD' = any (coalesce(v_org.enabled_jurisdiction_codes, '{}'::text[]))) then
            return false;
        end if;

        select id into v_qld_id
        from public.jurisdictions
        where code = 'QLD'
        limit 1;

        if v_qld_id is null then
            return false;
        end if;

        select * into v_profile
        from public.organisation_jurisdiction_profiles
        where organisation_id = p_organisation_id
          and jurisdiction_id = v_qld_id;

        if not found then
            return false;
        end if;

        if nullif(btrim(coalesce(v_profile.client_reference, '')), '') is null then
            return false;
        end if;

        if nullif(btrim(coalesce(v_profile.licence_number, '')), '') is null then
            return false;
        end if;
    end if;

    return true;
end;
$$;

revoke all on function public.organisation_is_trade_ready(bigint, boolean) from public;
grant execute on function public.organisation_is_trade_ready(bigint, boolean) to authenticated;

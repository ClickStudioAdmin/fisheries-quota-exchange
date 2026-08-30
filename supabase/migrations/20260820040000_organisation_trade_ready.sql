-- Authenticated buyers can check whether a seller (or any business) has
-- completed the identity fields required to trade, without reading the row.
-- Queensland licence fields are included only when p_require_qld is true.

create or replace function public.australian_address_is_complete(p_address jsonb)
returns boolean
language sql
immutable
as $$
    select
        p_address is not null
        and nullif(btrim(coalesce(p_address->>'line1', '')), '') is not null
        and nullif(btrim(coalesce(p_address->>'suburb', '')), '') is not null
        and coalesce(p_address->>'state', '') in (
            'ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'
        )
        and coalesce(p_address->>'postcode', '') ~ '^\d{4}$'
$$;

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

revoke all on function public.australian_address_is_complete(jsonb) from public;

revoke all on function public.organisation_is_trade_ready(bigint, boolean) from public;
grant execute on function public.organisation_is_trade_ready(bigint, boolean) to authenticated;

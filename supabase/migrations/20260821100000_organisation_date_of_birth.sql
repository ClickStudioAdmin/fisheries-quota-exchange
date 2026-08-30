-- Individual businesses store a date of birth. It is required to buy or list.
-- Companies keep the column null. Official FDU date-of-birth fields stay blank
-- for offline witnessing.

alter table public.organisations
    add column if not exists date_of_birth date;

alter table public.organisations
    drop constraint if exists organisations_date_of_birth_individual;

alter table public.organisations
    add constraint organisations_date_of_birth_individual
        check (date_of_birth is null or entity_kind = 'INDIVIDUAL');

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

    if v_org.entity_kind = 'INDIVIDUAL'
        and v_org.date_of_birth is null then
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

create or replace function public.transfer_party_profile_payload(
    p_organisation_id bigint,
    p_jurisdiction_id bigint
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'id', o.id,
        'legal_name', o.legal_name,
        'trading_name', o.trading_name,
        'abn', o.abn,
        'entity_kind', o.entity_kind,
        'acn', o.acn,
        'date_of_birth', o.date_of_birth,
        'email', (
            select u.email
            from public.organisation_users as u
            where u.organisation_id = o.id
              and u.role in ('OWNER', 'ADMIN')
            order by case when u.role = 'OWNER' then 0 else 1 end, u.email
            limit 1
        ),
        'mobile', o.mobile,
        'registered_address', o.registered_address,
        'postal_address', o.postal_address,
        'postal_same_as_registered', o.postal_same_as_registered,
        'signatories', (
            select coalesce(
                jsonb_agg(
                    jsonb_build_object(
                        'full_name', u.full_name,
                        'role', u.role
                    )
                    order by u.role, u.full_name
                ),
                '[]'::jsonb
            )
            from public.organisation_users as u
            where u.organisation_id = o.id
              and u.role in ('OWNER', 'ADMIN')
        ),
        'profile', (
            select jsonb_build_object(
                'organisation_id', p.organisation_id,
                'jurisdiction_id', p.jurisdiction_id,
                'client_reference', p.client_reference,
                'licence_number', p.licence_number,
                'fishery_symbols', p.fishery_symbols
            )
            from public.organisation_jurisdiction_profiles as p
            where p.organisation_id = o.id
              and p.jurisdiction_id = p_jurisdiction_id
        )
    )
    from public.organisations as o
    where o.id = p_organisation_id;
$$;

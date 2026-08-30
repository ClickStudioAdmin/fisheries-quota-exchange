-- Phase 10: structured Australian addresses on businesses.
-- Drop unused organisation phone. ACN stays company-only in the app.

alter table public.organisations
    add column if not exists postal_same_as_registered boolean not null default true;

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

alter table public.organisations
    drop column if exists phone;

alter table public.organisations
    alter column registered_address type jsonb
    using (
        case
            when registered_address is null or btrim(registered_address) = '' then null
            else jsonb_build_object(
                'line1', registered_address,
                'line2', null,
                'suburb', '',
                'state', '',
                'postcode', ''
            )
        end
    );

alter table public.organisations
    alter column postal_address type jsonb
    using (
        case
            when postal_address is null or btrim(postal_address) = '' then null
            else jsonb_build_object(
                'line1', postal_address,
                'line2', null,
                'suburb', '',
                'state', '',
                'postcode', ''
            )
        end
    );

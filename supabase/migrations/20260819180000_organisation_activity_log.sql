-- Organisation and platform activity logs. Extends audit_events so each
-- business can read its own events and platform admins can read all of them.

alter table public.audit_events
    add column if not exists organisation_id bigint
        references public.organisations (id) on delete restrict,
    add column if not exists related_organisation_id bigint
        references public.organisations (id) on delete restrict;

create index if not exists audit_events_organisation_created_idx
    on public.audit_events (organisation_id, created_at desc);

create index if not exists audit_events_related_organisation_idx
    on public.audit_events (related_organisation_id, created_at desc);

drop function if exists public.write_audit_event(text, text, bigint, jsonb);

create function public.write_audit_event(
    p_event_type text,
    p_entity_type text,
    p_entity_id bigint,
    p_payload jsonb default '{}'::jsonb,
    p_organisation_id bigint default null,
    p_related_organisation_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_org bigint := p_organisation_id;
    v_related bigint := p_related_organisation_id;
    v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
    v_buyer_name text;
    v_seller_name text;
    v_listing_type text;
    v_fishery text;
begin
    if v_org is null and p_entity_type = 'order' then
        select
            buyer_organisation_id,
            seller_organisation_id,
            buyer_name,
            seller_name
        into v_org, v_related, v_buyer_name, v_seller_name
        from public.orders
        where id = p_entity_id;

        if v_buyer_name is not null and not v_payload ? 'buyer_name' then
            v_payload := v_payload || jsonb_build_object(
                'buyer_name', v_buyer_name,
                'seller_name', v_seller_name
            );
        end if;
    elsif v_org is null and p_entity_type = 'listing' then
        select organisation_id, listing_type, fishery_name
        into v_org, v_listing_type, v_fishery
        from public.listings
        where id = p_entity_id;

        if v_listing_type is not null and not v_payload ? 'listing_type' then
            v_payload := v_payload || jsonb_build_object(
                'listing_type', v_listing_type,
                'fishery_name', v_fishery
            );
        end if;

        if p_event_type = 'BID_PLACED'
           and v_related is null
           and v_payload ? 'organisation_id' then
            begin
                v_related := (v_payload ->> 'organisation_id')::bigint;
            exception
                when others then
                    v_related := null;
            end;
        end if;
    elsif v_org is null and p_entity_type = 'holding' then
        select organisation_id into v_org
        from public.quota_holdings
        where id = p_entity_id;
    elsif v_org is null and p_entity_type = 'organisation' then
        v_org := p_entity_id;
    elsif v_org is null and p_entity_type = 'invitation' then
        select organisation_id into v_org
        from public.organisation_invitations
        where id = p_entity_id;
    end if;

    insert into public.audit_events (
        event_type,
        entity_type,
        entity_id,
        actor_email,
        payload,
        organisation_id,
        related_organisation_id
    )
    values (
        p_event_type,
        p_entity_type,
        p_entity_id,
        public.current_user_email(),
        v_payload,
        v_org,
        v_related
    );
end;
$$;

revoke all on function public.write_audit_event(text, text, bigint, jsonb, bigint, bigint) from public;

update public.audit_events as events
set
    organisation_id = orders.buyer_organisation_id,
    related_organisation_id = orders.seller_organisation_id
from public.orders as orders
where events.entity_type = 'order'
  and events.entity_id = orders.id
  and events.organisation_id is null;

update public.audit_events as events
set organisation_id = listings.organisation_id
from public.listings as listings
where events.entity_type = 'listing'
  and events.entity_id = listings.id
  and events.organisation_id is null;

update public.audit_events
set related_organisation_id = (payload ->> 'organisation_id')::bigint
where event_type = 'BID_PLACED'
  and related_organisation_id is null
  and payload ? 'organisation_id'
  and payload ->> 'organisation_id' ~ '^[0-9]+$';

drop policy if exists audit_events_select on public.audit_events;

create policy audit_events_select
on public.audit_events
for select
to authenticated
using (
    public.is_platform_admin()
    or public.user_organisation_role(organisation_id) is not null
    or public.user_organisation_role(related_organisation_id) is not null
    or (
        organisation_id is null
        and entity_type = 'order'
        and exists (
            select 1
            from public.orders as orders
            where orders.id = audit_events.entity_id
              and (
                  public.user_organisation_role(orders.buyer_organisation_id) is not null
                  or public.user_organisation_role(orders.seller_organisation_id) is not null
              )
        )
    )
);

create function public.audit_organisations_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        perform public.write_audit_event(
            'ORGANISATION_CREATED',
            'organisation',
            new.id,
            jsonb_build_object('legal_name', new.legal_name),
            new.id,
            null
        );
        return new;
    end if;

    if new.legal_name is distinct from old.legal_name
       or new.trading_name is distinct from old.trading_name
       or new.abn is distinct from old.abn then
        perform public.write_audit_event(
            'ORGANISATION_DETAILS_UPDATED',
            'organisation',
            new.id,
            jsonb_build_object(
                'legal_name', new.legal_name,
                'trading_name', new.trading_name,
                'abn', new.abn
            ),
            new.id,
            null
        );
    end if;

    if new.notification_roles is distinct from old.notification_roles then
        perform public.write_audit_event(
            'NOTIFICATION_ROLES_UPDATED',
            'organisation',
            new.id,
            jsonb_build_object('notification_roles', to_jsonb(new.notification_roles)),
            new.id,
            null
        );
    end if;

    if new.disabled_notification_emails is distinct from old.disabled_notification_emails
       or new.disabled_notification_in_app is distinct from old.disabled_notification_in_app then
        perform public.write_audit_event(
            'NOTIFICATION_PREFERENCES_UPDATED',
            'organisation',
            new.id,
            '{}'::jsonb,
            new.id,
            null
        );
    end if;

    if new.stripe_account_id is distinct from old.stripe_account_id
       or new.stripe_charges_enabled is distinct from old.stripe_charges_enabled
       or new.stripe_details_submitted is distinct from old.stripe_details_submitted
       or new.stripe_payouts_enabled is distinct from old.stripe_payouts_enabled then
        perform public.write_audit_event(
            'PAYMENTS_SETUP_UPDATED',
            'organisation',
            new.id,
            jsonb_build_object(
                'charges_enabled', new.stripe_charges_enabled,
                'details_submitted', new.stripe_details_submitted
            ),
            new.id,
            null
        );
    end if;

    return new;
end;
$$;

create trigger organisations_audit
after insert or update on public.organisations
for each row
execute function public.audit_organisations_change();

create function public.audit_organisation_users_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        perform public.write_audit_event(
            'MEMBER_ADDED',
            'member',
            new.id,
            jsonb_build_object('email', new.email, 'role', new.role),
            new.organisation_id,
            null
        );
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if new.role is distinct from old.role then
            perform public.write_audit_event(
                'MEMBER_ROLE_CHANGED',
                'member',
                new.id,
                jsonb_build_object(
                    'email', new.email,
                    'role', new.role,
                    'previous_role', old.role
                ),
                new.organisation_id,
                null
            );
        end if;
        return new;
    end if;

    perform public.write_audit_event(
        case
            when public.current_user_email() = old.email then 'MEMBER_LEFT'
            else 'MEMBER_REMOVED'
        end,
        'member',
        old.id,
        jsonb_build_object('email', old.email, 'role', old.role),
        old.organisation_id,
        null
    );
    return old;
end;
$$;

create trigger organisation_users_audit
after insert or update or delete on public.organisation_users
for each row
execute function public.audit_organisation_users_change();

create function public.audit_organisation_invitations_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        perform public.write_audit_event(
            'MEMBER_INVITED',
            'invitation',
            new.id,
            jsonb_build_object('email', new.email, 'role', new.role),
            new.organisation_id,
            null
        );
        return new;
    end if;

    if tg_op = 'DELETE' then
        perform public.write_audit_event(
            case
                when public.current_user_email() = old.email then 'INVITATION_DECLINED'
                else 'INVITATION_CANCELLED'
            end,
            'invitation',
            old.id,
            jsonb_build_object('email', old.email, 'role', old.role),
            old.organisation_id,
            null
        );
        return old;
    end if;

    return new;
end;
$$;

create trigger organisation_invitations_audit
after insert or delete on public.organisation_invitations
for each row
execute function public.audit_organisation_invitations_change();

create function public.audit_quota_holdings_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_fishery text;
begin
    select name into v_fishery
    from public.fisheries
    where id = coalesce(new.fishery_id, old.fishery_id);

    if tg_op = 'INSERT' then
        perform public.write_audit_event(
            'HOLDING_CREATED',
            'holding',
            new.id,
            jsonb_build_object(
                'fishery_name', v_fishery,
                'quantity', new.quantity,
                'verification_status', new.verification_status
            ),
            new.organisation_id,
            null
        );
        return new;
    end if;

    if new.verification_status is distinct from old.verification_status then
        perform public.write_audit_event(
            case
                when new.verification_status = 'VERIFIED' then 'HOLDING_VERIFIED'
                else 'HOLDING_UNVERIFIED'
            end,
            'holding',
            new.id,
            jsonb_build_object(
                'fishery_name', v_fishery,
                'verification_status', new.verification_status
            ),
            new.organisation_id,
            null
        );
    elsif new.quantity is distinct from old.quantity then
        perform public.write_audit_event(
            'HOLDING_ADJUSTED',
            'holding',
            new.id,
            jsonb_build_object(
                'fishery_name', v_fishery,
                'quantity', new.quantity
            ),
            new.organisation_id,
            null
        );
    end if;

    return new;
end;
$$;

create trigger quota_holdings_audit
after insert or update on public.quota_holdings
for each row
execute function public.audit_quota_holdings_change();

create function public.audit_listings_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prefix text;
    v_event text;
begin
    v_prefix := case when coalesce(new.listing_type, old.listing_type) = 'AUCTION'
        then 'AUCTION'
        else 'LISTING'
    end;

    if tg_op = 'INSERT' then
        perform public.write_audit_event(
            v_prefix || '_CREATED',
            'listing',
            new.id,
            jsonb_build_object(
                'listing_type', new.listing_type,
                'offering', new.offering,
                'fishery_name', new.fishery_name,
                'quantity', new.quantity,
                'status', new.status
            ),
            new.organisation_id,
            null
        );
        return new;
    end if;

    if new.status is distinct from old.status then
        if new.status in ('RESERVED', 'SOLD', 'UNSOLD') then
            return new;
        end if;

        v_event := case new.status
            when 'PUBLISHED' then v_prefix || '_PUBLISHED'
            when 'CANCELLED' then v_prefix || '_CANCELLED'
            when 'REJECTED' then v_prefix || '_REJECTED'
            else v_prefix || '_UPDATED'
        end;

        perform public.write_audit_event(
            v_event,
            'listing',
            new.id,
            jsonb_build_object(
                'listing_type', new.listing_type,
                'fishery_name', new.fishery_name,
                'status', new.status
            ),
            new.organisation_id,
            null
        );
        return new;
    end if;

    if new.listing_type = 'AUCTION' then
        return new;
    end if;

    if new.quantity is distinct from old.quantity
       or new.unit_price_aud is distinct from old.unit_price_aud
       or new.expires_at is distinct from old.expires_at then
        perform public.write_audit_event(
            'LISTING_UPDATED',
            'listing',
            new.id,
            jsonb_build_object(
                'listing_type', new.listing_type,
                'fishery_name', new.fishery_name,
                'quantity', new.quantity,
                'unit_price_aud', new.unit_price_aud
            ),
            new.organisation_id,
            null
        );
    end if;

    return new;
end;
$$;

create trigger listings_audit
after insert or update on public.listings
for each row
execute function public.audit_listings_change();

create function public.audit_verified_users_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        perform public.write_audit_event(
            'USER_VERIFIED',
            'user',
            0,
            jsonb_build_object('email', new.email)
        );
        return new;
    end if;

    perform public.write_audit_event(
        'USER_UNVERIFIED',
        'user',
        0,
        jsonb_build_object('email', old.email)
    );
    return old;
end;
$$;

create trigger verified_users_audit
after insert or delete on public.verified_users
for each row
execute function public.audit_verified_users_change();

create function public.audit_platform_settings_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'UPDATE' then
        perform public.write_audit_event(
            'PLATFORM_SETTINGS_UPDATED',
            'settings',
            new.id,
            '{}'::jsonb
        );
    end if;
    return new;
end;
$$;

create trigger platform_settings_audit
after update on public.platform_settings
for each row
execute function public.audit_platform_settings_change();

notify pgrst, 'reload schema';

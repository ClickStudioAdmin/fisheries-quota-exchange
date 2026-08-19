-- Business setting: hide seller identity on public marketplace pages.
-- Listing and order snapshots keep the real name for trades, invoices, and admin.

alter table public.organisations
    add column hide_identity boolean not null default false;

create or replace function public.organisations_hide_identity(p_ids bigint[])
returns table(organisation_id bigint, hide_identity boolean)
language sql
stable
security definer
set search_path = public
as $$
    select organisations.id, organisations.hide_identity
    from public.organisations
    where organisations.id = any(p_ids);
$$;

revoke all on function public.organisations_hide_identity(bigint[]) from public;
grant execute on function public.organisations_hide_identity(bigint[]) to anon, authenticated;

create or replace function public.audit_organisations_change()
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
       or new.abn is distinct from old.abn
       or new.hide_identity is distinct from old.hide_identity then
        perform public.write_audit_event(
            'ORGANISATION_DETAILS_UPDATED',
            'organisation',
            new.id,
            jsonb_build_object(
                'legal_name', new.legal_name,
                'trading_name', new.trading_name,
                'abn', new.abn,
                'hide_identity', new.hide_identity
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

notify pgrst, 'reload schema';

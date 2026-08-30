-- Allow reconnecting Stripe before the seller can accept charges.
-- Used when the first Connect account cannot run embedded onboarding.

create or replace function public.attach_organisation_stripe_account(
    p_organisation_id bigint,
    p_account_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role text;
    v_existing text;
    v_charges boolean;
begin
    v_role := public.user_organisation_role(p_organisation_id);

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot connect payments for that account';
    end if;

    if p_account_id is null or length(trim(p_account_id)) = 0 then
        raise exception 'Stripe account is required';
    end if;

    select stripe_account_id, stripe_charges_enabled
    into v_existing, v_charges
    from public.organisations
    where id = p_organisation_id
    for update;

    if not found then
        raise exception 'Organisation not found';
    end if;

    if v_existing is not null
       and v_existing <> trim(p_account_id)
       and coalesce(v_charges, false) then
        raise exception 'This account is already connected to Stripe';
    end if;

    update public.organisations
    set
        stripe_account_id = trim(p_account_id),
        stripe_charges_enabled = false,
        stripe_payouts_enabled = false,
        stripe_details_submitted = false
    where id = p_organisation_id;
end;
$$;

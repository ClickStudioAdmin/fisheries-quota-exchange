-- Holding auto-approval follows verified_users only.
-- Being a platform admin must not keep a holding verified after a member update.

create or replace function public.holding_status_for_actor()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select case
        when public.is_verified_user() then 'VERIFIED'
        else 'PENDING_VERIFICATION'
    end
$$;

create or replace function public.adjust_quota_holding(
    p_holding_id bigint,
    p_quantity numeric,
    p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_reserved numeric;
    v_status text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = p_holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_role := public.user_organisation_role(v_holding.organisation_id);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot update this holding';
    end if;

    if p_quantity is null or p_quantity < 0 then
        raise exception 'Quantity cannot be negative';
    end if;

    if p_quantity = v_holding.quantity then
        raise exception 'Quantity is unchanged';
    end if;

    v_reserved := coalesce((
        select sum(reservations.quantity)
        from public.quota_reservations as reservations
        where reservations.holding_id = p_holding_id
          and reservations.status = 'ACTIVE'
    ), 0);

    if p_quantity < v_reserved then
        raise exception 'Quantity cannot be below reserved quota';
    end if;

    perform public.apply_quota_event(
        p_holding_id,
        'ADJUSTMENT',
        p_quantity - v_holding.quantity,
        p_note
    );

    v_status := public.holding_status_for_actor();

    update public.quota_holdings
    set
        verification_status = v_status,
        verified_at = case when v_status = 'VERIFIED' then now() else null end,
        verified_by_email = case
            when v_status = 'VERIFIED' then public.current_user_email()
            else null
        end
    where id = p_holding_id;
end;
$$;

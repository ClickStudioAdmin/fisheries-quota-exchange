-- Log each newly saved review check. Approve / verify still write their
-- existing final audit events.

create or replace function public.save_holding_verification_checklist(
    p_holding_id bigint,
    p_completed text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_old jsonb;
    v_org bigint;
    v_check text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select verification_checklist, organisation_id
    into v_old, v_org
    from public.quota_holdings
    where id = p_holding_id
      and verification_status = 'PENDING_VERIFICATION';

    if not found then
        raise exception 'Holding is not waiting for verification';
    end if;

    update public.quota_holdings
    set verification_checklist = to_jsonb(coalesce(p_completed, '{}'::text[]))
    where id = p_holding_id
      and verification_status = 'PENDING_VERIFICATION';

    for v_check in
        select new_checks.value
        from jsonb_array_elements_text(
            to_jsonb(coalesce(p_completed, '{}'::text[]))
        ) as new_checks(value)
        where not exists (
            select 1
            from jsonb_array_elements_text(coalesce(v_old, '[]'::jsonb)) as old_checks(value)
            where old_checks.value = new_checks.value
        )
    loop
        perform public.write_audit_event(
            'HOLDING_CHECK_COMPLETED',
            'holding',
            p_holding_id,
            jsonb_build_object('check', v_check),
            v_org,
            null
        );
    end loop;
end;
$$;

create or replace function public.save_listing_approval_checklist(
    p_listing_id bigint,
    p_completed text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_old jsonb;
    v_org bigint;
    v_check text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select approval_checklist, organisation_id
    into v_old, v_org
    from public.listings
    where id = p_listing_id
      and status = 'PENDING_APPROVAL';

    if not found then
        raise exception 'Listing is not waiting for approval';
    end if;

    update public.listings
    set approval_checklist = to_jsonb(coalesce(p_completed, '{}'::text[]))
    where id = p_listing_id
      and status = 'PENDING_APPROVAL';

    for v_check in
        select new_checks.value
        from jsonb_array_elements_text(
            to_jsonb(coalesce(p_completed, '{}'::text[]))
        ) as new_checks(value)
        where not exists (
            select 1
            from jsonb_array_elements_text(coalesce(v_old, '[]'::jsonb)) as old_checks(value)
            where old_checks.value = new_checks.value
        )
    loop
        perform public.write_audit_event(
            'LISTING_CHECK_COMPLETED',
            'listing',
            p_listing_id,
            jsonb_build_object('check', v_check),
            v_org,
            null
        );
    end loop;
end;
$$;

create or replace function public.save_compliance_checklist(
    p_order_id bigint,
    p_completed text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_old jsonb;
    v_check text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select compliance_checklist
    into v_old
    from public.orders
    where id = p_order_id
      and status = 'AWAITING_COMPLIANCE';

    if not found then
        raise exception 'Order is not waiting for compliance review';
    end if;

    update public.orders
    set compliance_checklist = to_jsonb(coalesce(p_completed, '{}'::text[]))
    where id = p_order_id
      and status = 'AWAITING_COMPLIANCE';

    for v_check in
        select new_checks.value
        from jsonb_array_elements_text(
            to_jsonb(coalesce(p_completed, '{}'::text[]))
        ) as new_checks(value)
        where not exists (
            select 1
            from jsonb_array_elements_text(coalesce(v_old, '[]'::jsonb)) as old_checks(value)
            where old_checks.value = new_checks.value
        )
    loop
        perform public.write_audit_event(
            'COMPLIANCE_CHECK_COMPLETED',
            'order',
            p_order_id,
            jsonb_build_object('check', v_check)
        );
    end loop;
end;
$$;

-- Saving Queensland compliance checks no longer requires a signing channel
-- on the same submit. The channel is saved from the Decision section.

create or replace function public.save_compliance_checklist(
    p_order_id bigint,
    p_completed text[],
    p_qld_signing_channel text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_old jsonb;
    v_check text;
    v_jurisdiction text;
    v_channel text;
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

    v_jurisdiction := public.order_jurisdiction_code(p_order_id);

    if v_jurisdiction = 'QLD' then
        v_channel := nullif(trim(coalesce(p_qld_signing_channel, '')), '');
        if v_channel is not null and v_channel not in ('OFFLINE', 'PANDADOC') then
            raise exception 'Choose Offline pack or Sign online';
        end if;
    else
        v_channel := null;
    end if;

    update public.orders
    set
        compliance_checklist = to_jsonb(coalesce(p_completed, '{}'::text[])),
        qld_signing_channel = case
            when v_jurisdiction = 'QLD' and v_channel is not null then v_channel
            when v_jurisdiction = 'QLD' then qld_signing_channel
            else null
        end
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

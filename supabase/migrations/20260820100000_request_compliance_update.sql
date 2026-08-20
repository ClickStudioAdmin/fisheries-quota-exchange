-- Request an update during compliance review. The order stays
-- AWAITING_COMPLIANCE and the reservation stays. Each party's message is an
-- audit row scoped to that organisation only, so the other party cannot read it.

create function public.request_compliance_update(
    p_order_id bigint,
    p_buyer_note text,
    p_seller_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_buyer bigint;
    v_seller bigint;
    v_buyer_note text := nullif(trim(p_buyer_note), '');
    v_seller_note text := nullif(trim(p_seller_note), '');
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    if v_buyer_note is null and v_seller_note is null then
        raise exception 'Choose at least one party and include a message';
    end if;

    select buyer_organisation_id, seller_organisation_id
    into v_buyer, v_seller
    from public.orders
    where id = p_order_id
      and status = 'AWAITING_COMPLIANCE';

    if not found then
        raise exception 'Order is not waiting for compliance review';
    end if;

    if v_buyer_note is not null then
        perform public.write_audit_event(
            'COMPLIANCE_UPDATE_REQUESTED_BUYER',
            'order',
            p_order_id,
            jsonb_build_object('note', v_buyer_note, 'party', 'buyer'),
            v_buyer,
            null
        );
    end if;

    if v_seller_note is not null then
        perform public.write_audit_event(
            'COMPLIANCE_UPDATE_REQUESTED_SELLER',
            'order',
            p_order_id,
            jsonb_build_object('note', v_seller_note, 'party', 'seller'),
            v_seller,
            null
        );
    end if;
end;
$$;

revoke all on function public.request_compliance_update(bigint, text, text) from public;
grant execute on function public.request_compliance_update(bigint, text, text) to authenticated;

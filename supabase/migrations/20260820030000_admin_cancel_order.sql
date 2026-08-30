-- Order cancel is platform admin only. Buyers and sellers cannot cancel
-- from the order page. Unpaid Checkout expiry still uses fail_unpaid_order.

create or replace function public.cancel_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
begin
    if not public.is_platform_admin() then
        raise exception 'You cannot cancel this order';
    end if;

    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status not in ('AWAITING_COMPLIANCE', 'AWAITING_PAYMENT') then
        raise exception 'Order cannot be cancelled';
    end if;

    update public.orders
    set status = 'CANCELLED'
    where id = p_order_id;

    perform public.release_order_reservation(p_order_id);

    update public.payments
    set status = 'EXPIRED'
    where order_id = p_order_id
      and status = 'PENDING';

    perform public.write_audit_event(
        'ORDER_CANCELLED',
        'order',
        p_order_id,
        '{}'::jsonb
    );
end;
$$;

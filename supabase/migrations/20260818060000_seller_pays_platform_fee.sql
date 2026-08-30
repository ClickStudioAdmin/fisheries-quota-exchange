-- Buyer pays the listed quota amount. The platform fee is deducted from the
-- seller at settlement, not added on top of the Checkout charge.

create or replace function public.mark_order_paid(
    p_order_id bigint,
    p_checkout_session_id text,
    p_payment_intent_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
begin
    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Order not found';
    end if;

    if v_order.status = 'AWAITING_COMPLIANCE'
       and exists (
           select 1
           from public.payments
           where order_id = p_order_id
             and status = 'PAID'
       ) then
        return;
    end if;

    if v_order.status <> 'AWAITING_PAYMENT' then
        raise exception 'Order is not waiting for payment';
    end if;

    update public.orders
    set status = 'AWAITING_COMPLIANCE'
    where id = p_order_id;

    insert into public.payments (
        order_id,
        checkout_session_id,
        payment_intent_id,
        status,
        amount_aud,
        fee_amount_aud
    )
    values (
        p_order_id,
        nullif(trim(p_checkout_session_id), ''),
        nullif(trim(p_payment_intent_id), ''),
        'PAID',
        v_order.amount_aud,
        v_order.fee_amount_aud
    )
    on conflict (order_id) do update
    set
        checkout_session_id = coalesce(
            excluded.checkout_session_id,
            public.payments.checkout_session_id
        ),
        payment_intent_id = coalesce(
            excluded.payment_intent_id,
            public.payments.payment_intent_id
        ),
        status = 'PAID';

    perform public.write_audit_event(
        'PAYMENT_RECEIVED',
        'order',
        p_order_id,
        jsonb_build_object(
            'provider', 'stripe',
            'checkout_session_id', nullif(trim(p_checkout_session_id), ''),
            'payment_intent_id', nullif(trim(p_payment_intent_id), '')
        )
    );
end;
$$;

revoke all on function public.mark_order_paid(bigint, text, text) from public;
grant execute on function public.mark_order_paid(bigint, text, text) to service_role;

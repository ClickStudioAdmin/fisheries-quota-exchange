-- Separate charges and transfers: record the seller Transfer created at settlement.

alter table public.payments
    add column stripe_transfer_id text;

alter table public.payments
    add constraint payments_stripe_transfer_id_unique
        unique (stripe_transfer_id);

create function public.attach_order_seller_transfer(
    p_order_id bigint,
    p_transfer_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_existing text;
begin
    if p_transfer_id is null or length(trim(p_transfer_id)) = 0 then
        raise exception 'Transfer is required';
    end if;

    select stripe_transfer_id
    into v_existing
    from public.payments
    where order_id = p_order_id
    for update;

    if not found then
        raise exception 'Payment not found';
    end if;

    if v_existing is not null and v_existing <> trim(p_transfer_id) then
        raise exception 'This order already has a seller transfer';
    end if;

    update public.payments
    set stripe_transfer_id = trim(p_transfer_id)
    where order_id = p_order_id;
end;
$$;

revoke all on function public.attach_order_seller_transfer(bigint, text) from public;
grant execute on function public.attach_order_seller_transfer(bigint, text) to service_role;

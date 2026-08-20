-- Admin working checklist on compliance review. Progress is a list of
-- completed check labels for the current transfer process. Not a legal
-- record and not trusted from the browser without this RPC.

alter table public.orders
    add column if not exists compliance_checklist jsonb not null default '[]'::jsonb;

alter table public.orders
    drop constraint if exists orders_compliance_checklist_array;

alter table public.orders
    add constraint orders_compliance_checklist_array
        check (jsonb_typeof(compliance_checklist) = 'array');

create or replace function public.save_compliance_checklist(
    p_order_id bigint,
    p_completed text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    update public.orders
    set compliance_checklist = to_jsonb(coalesce(p_completed, '{}'::text[]))
    where id = p_order_id
      and status = 'AWAITING_COMPLIANCE';

    if not found then
        raise exception 'Order is not waiting for compliance review';
    end if;
end;
$$;

revoke all on function public.save_compliance_checklist(bigint, text[]) from public;
grant execute on function public.save_compliance_checklist(bigint, text[]) to authenticated;

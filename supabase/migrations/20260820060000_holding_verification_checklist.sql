-- Admin working checklist on holding verification. Progress is a list of
-- completed check labels. Not a legal record and not trusted from the
-- browser without this RPC.

alter table public.quota_holdings
    add column if not exists verification_checklist jsonb not null default '[]'::jsonb;

alter table public.quota_holdings
    drop constraint if exists quota_holdings_verification_checklist_array;

alter table public.quota_holdings
    add constraint quota_holdings_verification_checklist_array
        check (jsonb_typeof(verification_checklist) = 'array');

create or replace function public.save_holding_verification_checklist(
    p_holding_id bigint,
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

    update public.quota_holdings
    set verification_checklist = to_jsonb(coalesce(p_completed, '{}'::text[]))
    where id = p_holding_id
      and verification_status = 'PENDING_VERIFICATION';

    if not found then
        raise exception 'Holding is not waiting for verification';
    end if;
end;
$$;

revoke all on function public.save_holding_verification_checklist(bigint, text[]) from public;
grant execute on function public.save_holding_verification_checklist(bigint, text[]) to authenticated;

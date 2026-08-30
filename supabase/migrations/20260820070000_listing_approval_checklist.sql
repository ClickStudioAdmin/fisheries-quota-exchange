-- Admin working checklist on listing approval. Progress is a list of
-- completed check labels. Not a legal record and not trusted from the
-- browser without this RPC.

alter table public.listings
    add column if not exists approval_checklist jsonb not null default '[]'::jsonb;

alter table public.listings
    drop constraint if exists listings_approval_checklist_array;

alter table public.listings
    add constraint listings_approval_checklist_array
        check (jsonb_typeof(approval_checklist) = 'array');

create or replace function public.save_listing_approval_checklist(
    p_listing_id bigint,
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

    update public.listings
    set approval_checklist = to_jsonb(coalesce(p_completed, '{}'::text[]))
    where id = p_listing_id
      and status = 'PENDING_APPROVAL';

    if not found then
        raise exception 'Listing is not waiting for approval';
    end if;
end;
$$;

revoke all on function public.save_listing_approval_checklist(bigint, text[]) from public;
grant execute on function public.save_listing_approval_checklist(bigint, text[]) to authenticated;

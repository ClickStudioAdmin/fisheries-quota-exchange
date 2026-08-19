-- Public hide-identity flags must be readable without membership of that
-- business. organisations SELECT is members-only, so a narrow view and an
-- aliased SECURITY DEFINER RPC expose only id + hide_identity.

create or replace view public.organisation_public_identity
    with (security_invoker = false) as
select
    organisations.id as organisation_id,
    organisations.hide_identity
from public.organisations;

grant select on public.organisation_public_identity to anon, authenticated;

create or replace function public.organisations_hide_identity(p_ids bigint[])
returns table(organisation_id bigint, hide_identity boolean)
language sql
stable
security definer
set search_path = public
as $$
    select
        organisations.id as organisation_id,
        organisations.hide_identity
    from public.organisations
    where organisations.id = any(p_ids);
$$;

revoke all on function public.organisations_hide_identity(bigint[]) from public;
grant execute on function public.organisations_hide_identity(bigint[]) to anon, authenticated;

notify pgrst, 'reload schema';

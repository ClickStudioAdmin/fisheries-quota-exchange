-- Ensure admin badge counts exist even if an earlier listings migration
-- applied before admin_action_counts was added.

create or replace function public.admin_action_counts()
returns table (
    holdings integer,
    listings integer,
    orders integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    return query
    select
        (
            select count(*)::integer
            from public.quota_holdings
            where verification_status = 'PENDING_VERIFICATION'
        ) as holdings,
        (
            select count(*)::integer
            from public.listings
            where status = 'PENDING_APPROVAL'
        ) as listings,
        (
            select count(*)::integer
            from public.orders
            where status in (
                'AWAITING_COMPLIANCE',
                'AWAITING_TRANSFER',
                'AWAITING_SETTLEMENT'
            )
        ) as orders;
end;
$$;

revoke all on function public.admin_action_counts() from public;
grant execute on function public.admin_action_counts() to authenticated;

notify pgrst, 'reload schema';

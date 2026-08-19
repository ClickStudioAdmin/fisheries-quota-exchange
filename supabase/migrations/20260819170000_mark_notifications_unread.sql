create function public.mark_user_notifications_unread(p_ids bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
begin
    v_email := public.current_user_email();

    if v_email is null or v_email = '' then
        raise exception 'Not authenticated';
    end if;

    if p_ids is null or array_length(p_ids, 1) is null then
        return;
    end if;

    update public.user_notifications
    set read_at = null
    where email = v_email
      and read_at is not null
      and id = any(p_ids);
end;
$$;

revoke all on function public.mark_user_notifications_unread(bigint[]) from public;
grant execute on function public.mark_user_notifications_unread(bigint[]) to authenticated;

notify pgrst, 'reload schema';

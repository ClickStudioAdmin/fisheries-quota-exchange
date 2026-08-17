-- Platform admins can list Auth names and phones for the users table.

create function public.admin_auth_people()
returns table (
    email text,
    full_name text,
    phone text
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
        lower(users.email)::text,
        nullif(
            trim(coalesce(
                users.raw_user_meta_data ->> 'full_name',
                users.raw_user_meta_data ->> 'name',
                users.raw_user_meta_data ->> 'display_name',
                ''
            )),
            ''
        ),
        nullif(trim(coalesce(users.raw_user_meta_data ->> 'phone', '')), '')
    from auth.users as users
    where users.email is not null;
end;
$$;

revoke all on function public.admin_auth_people() from public;
grant execute on function public.admin_auth_people() to authenticated;

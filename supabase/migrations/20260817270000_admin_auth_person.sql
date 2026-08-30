-- Platform admins can read a person's name and phone from Auth metadata.
-- Do not expose auth.users to the browser client.

create function public.admin_auth_person(p_email text)
returns table (
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
    where lower(users.email) = lower(trim(coalesce(p_email, '')))
    limit 1;
end;
$$;

revoke all on function public.admin_auth_person(text) from public;
grant execute on function public.admin_auth_person(text) to authenticated;

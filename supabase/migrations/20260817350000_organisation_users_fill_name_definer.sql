-- Adding a member inserts as the signed-in role. The fill-name trigger
-- must read auth.users as the function owner, not as authenticated.

create or replace function public.organisation_users_fill_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_name text;
begin
    new.email := lower(trim(new.email));

    if new.full_name is not null and trim(new.full_name) <> '' then
        new.full_name := trim(new.full_name);
        return new;
    end if;

    select nullif(
        trim(coalesce(
            auth_users.raw_user_meta_data ->> 'full_name',
            auth_users.raw_user_meta_data ->> 'name',
            auth_users.raw_user_meta_data ->> 'display_name',
            ''
        )),
        ''
    )
    into v_name
    from auth.users as auth_users
    where lower(auth_users.email) = new.email;

    if v_name is null then
        select other.full_name
        into v_name
        from public.organisation_users as other
        where other.email = new.email
          and other.id is distinct from new.id
          and other.full_name is not null
          and trim(other.full_name) <> ''
        order by other.id
        limit 1;
    end if;

    new.full_name := coalesce(nullif(trim(v_name), ''), public.default_person_name(new.email));
    return new;
end;
$$;

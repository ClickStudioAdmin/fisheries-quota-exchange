-- Platform admins can remove users from all accounts. The last-owner
-- trigger still applies to organisation members; this function skips it
-- for the admin delete only.

create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
as $$
declare
    owner_count integer;
begin
    if current_setting('fqx.skip_last_owner_check', true) = 'true' then
        if tg_op = 'DELETE' then
            return old;
        end if;

        return new;
    end if;

    if tg_op = 'DELETE' then
        if old.role = 'OWNER' then
            select count(*)
            into owner_count
            from public.organisation_users
            where organisation_id = old.organisation_id
              and role = 'OWNER'
              and id <> old.id;

            if owner_count = 0 then
                raise exception 'Cannot remove the last owner';
            end if;
        end if;

        return old;
    end if;

    if old.role = 'OWNER'
       and new.role is distinct from 'OWNER' then
        select count(*)
        into owner_count
        from public.organisation_users
        where organisation_id = old.organisation_id
          and role = 'OWNER'
          and id <> old.id;

        if owner_count = 0 then
            raise exception 'Cannot remove the last owner';
        end if;
    end if;

    return new;
end;
$$;

create function public.admin_delete_users(p_emails text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_actor text;
    v_emails text[];
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    v_actor := public.current_user_email();

    select array_agg(distinct lower(trim(email)))
    into v_emails
    from unnest(coalesce(p_emails, '{}'::text[])) as email
    where email is not null
      and trim(email) <> ''
      and position('@' in email) > 0;

    if v_emails is null then
        return;
    end if;

    if v_actor = any (v_emails) then
        raise exception 'You cannot delete your own user';
    end if;

    if exists (
        select 1
        from public.platform_admins as admins
        where admins.email = any (v_emails)
    )
    and not exists (
        select 1
        from public.platform_admins as remaining
        where remaining.email <> all (v_emails)
    ) then
        raise exception 'Cannot delete the last platform admin';
    end if;

    perform set_config('fqx.skip_last_owner_check', 'true', true);

    delete from public.organisation_users
    where email = any (v_emails);

    delete from public.verified_users
    where email = any (v_emails);

    delete from public.platform_admins
    where email = any (v_emails);
end;
$$;

revoke all on function public.admin_delete_users(text[]) from public;
grant execute on function public.admin_delete_users(text[]) to authenticated;

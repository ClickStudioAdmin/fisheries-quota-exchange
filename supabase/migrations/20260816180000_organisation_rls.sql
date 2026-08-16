-- Phase 4: organisation access control.
-- Membership stays keyed by email. Auth users match via current_user_email().

create function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(u.email)
  from auth.users as u
  where u.id = auth.uid()
$$;

revoke all on function public.current_user_email() from public;
grant execute on function public.current_user_email() to authenticated;

create function public.user_organisation_role(org_id bigint)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ou.role
  from public.organisation_users as ou
  where ou.organisation_id = org_id
    and lower(ou.email) = public.current_user_email()
  limit 1
$$;

revoke all on function public.user_organisation_role(bigint) from public;
grant execute on function public.user_organisation_role(bigint) to authenticated;

create function public.create_organisation(
    p_legal_name text,
    p_trading_name text,
    p_abn text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
    v_id bigint;
    v_abn text;
begin
    v_email := public.current_user_email();

    if v_email is null or v_email = '' then
        raise exception 'Not authenticated';
    end if;

    if p_legal_name is null or length(trim(p_legal_name)) = 0 then
        raise exception 'Legal name is required';
    end if;

    v_abn := nullif(trim(p_abn), '');

    insert into public.organisations (legal_name, trading_name, abn)
    values (
        trim(p_legal_name),
        nullif(trim(p_trading_name), ''),
        v_abn
    )
    returning id into v_id;

    insert into public.organisation_users (organisation_id, email, role)
    values (v_id, v_email, 'OWNER');

    return v_id;
end;
$$;

revoke all on function public.create_organisation(text, text, text) from public;
grant execute on function public.create_organisation(text, text, text) to authenticated;

create function public.organisation_users_lowercase_email()
returns trigger
language plpgsql
as $$
begin
    new.email := lower(trim(new.email));
    return new;
end;
$$;

create trigger organisation_users_lowercase_email
before insert or update of email on public.organisation_users
for each row
execute function public.organisation_users_lowercase_email();

create function public.prevent_last_owner_removal()
returns trigger
language plpgsql
as $$
declare
    owner_count integer;
begin
    if tg_op = 'DELETE' and old.role = 'OWNER' then
        select count(*)
        into owner_count
        from public.organisation_users
        where organisation_id = old.organisation_id
          and role = 'OWNER'
          and id <> old.id;

        if owner_count = 0 then
            raise exception 'Cannot remove the last owner';
        end if;

        return old;
    end if;

    if tg_op = 'UPDATE'
       and old.role = 'OWNER'
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

create trigger organisation_users_prevent_last_owner
before update or delete on public.organisation_users
for each row
execute function public.prevent_last_owner_removal();

create policy organisations_select
on public.organisations
for select
to authenticated
using (public.user_organisation_role(id) is not null);

create policy organisations_update
on public.organisations
for update
to authenticated
using (public.user_organisation_role(id) in ('OWNER', 'ADMIN'))
with check (public.user_organisation_role(id) in ('OWNER', 'ADMIN'));

create policy organisation_users_select
on public.organisation_users
for select
to authenticated
using (public.user_organisation_role(organisation_id) is not null);

create policy organisation_users_insert
on public.organisation_users
for insert
to authenticated
with check (
    (
        public.user_organisation_role(organisation_id) = 'OWNER'
        and role in ('OWNER', 'ADMIN', 'MEMBER')
    )
    or (
        public.user_organisation_role(organisation_id) = 'ADMIN'
        and role in ('ADMIN', 'MEMBER')
    )
);

create policy organisation_users_update
on public.organisation_users
for update
to authenticated
using (public.user_organisation_role(organisation_id) = 'OWNER')
with check (public.user_organisation_role(organisation_id) = 'OWNER');

create policy organisation_users_delete
on public.organisation_users
for delete
to authenticated
using (
    public.user_organisation_role(organisation_id) = 'OWNER'
    or (
        public.user_organisation_role(organisation_id) = 'ADMIN'
        and role = 'MEMBER'
    )
    or (
        lower(email) = public.current_user_email()
        and public.user_organisation_role(organisation_id) is not null
    )
);

-- Every organisation member has a display name. Auth metadata still wins
-- when present. Seed and other emails without Auth get a stable generated name.

create function public.default_person_name(p_email text)
returns text
language sql
immutable
as $$
    select
        (array[
            'Alex','Sam','Jordan','Casey','Riley','Morgan','Taylor','Quinn',
            'Avery','Harper','Drew','Reese','Cameron','Hayden','Parker','Rowan',
            'Jamie','Charlie','Blake','Finley','Jesse','Kendall','Logan','Micah',
            'Peyton','River','Sage','Shawn','Elliot','Frankie'
        ])[
            1 + (
                ('x' || substr(md5(lower(trim(p_email))), 1, 8))::bit(32)::bigint
                % 30
            )
        ]
        || ' '
        || (array[
            'Nguyen','Chen','Williams','Brown','Wilson','Taylor','Anderson',
            'Thomas','Jackson','White','Harris','Martin','Thompson','Garcia',
            'Lee','Walker','Hall','Allen','Young','King','Wright','Scott',
            'Green','Baker','Adams','Lewis','Clark','Robinson','Halloran','Singh'
        ])[
            1 + (
                ('x' || substr(md5(lower(trim(p_email)) || ':last'), 1, 8))::bit(32)::bigint
                % 30
            )
        ]
$$;

alter table public.organisation_users
    add column full_name text;

update public.organisation_users as members
set full_name = nullif(
    trim(coalesce(
        auth_users.raw_user_meta_data ->> 'full_name',
        auth_users.raw_user_meta_data ->> 'name',
        auth_users.raw_user_meta_data ->> 'display_name',
        ''
    )),
    ''
)
from auth.users as auth_users
where lower(auth_users.email) = members.email
  and members.full_name is null;

update public.organisation_users as members
set full_name = (
    select other.full_name
    from public.organisation_users as other
    where other.email = members.email
      and other.full_name is not null
      and trim(other.full_name) <> ''
    order by other.id
    limit 1
)
where members.full_name is null;

update public.organisation_users
set full_name = public.default_person_name(email)
where full_name is null or trim(full_name) = '';

alter table public.organisation_users
    alter column full_name set not null;

alter table public.organisation_users
    add constraint organisation_users_full_name_check
        check (length(trim(full_name)) > 0);

create function public.organisation_users_fill_name()
returns trigger
language plpgsql
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

create trigger organisation_users_fill_name
before insert or update on public.organisation_users
for each row
execute function public.organisation_users_fill_name();

create function public.sync_organisation_user_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_name text;
begin
    if new.email is null then
        return new;
    end if;

    v_name := nullif(
        trim(coalesce(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name',
            new.raw_user_meta_data ->> 'display_name',
            ''
        )),
        ''
    );

    if v_name is not null then
        update public.organisation_users
        set full_name = v_name
        where email = lower(new.email);
    end if;

    return new;
end;
$$;

create trigger sync_organisation_user_name
after insert or update of raw_user_meta_data, email on auth.users
for each row
execute function public.sync_organisation_user_name();

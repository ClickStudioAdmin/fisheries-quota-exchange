-- BEFORE DELETE triggers must return OLD. Returning NEW (null on delete)
-- silently cancelled removal of ADMIN and MEMBER rows.

create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
as $$
declare
    owner_count integer;
begin
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

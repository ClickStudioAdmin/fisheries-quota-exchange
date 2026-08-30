-- Account-level email routing. Owners and admins choose which roles
-- receive organisation mail. Default matches the previous manager list.

alter table public.organisations
    add column notification_roles text[] not null default array['OWNER', 'ADMIN']::text[];

alter table public.organisations
    add constraint organisations_notification_roles_check
    check (
        cardinality(notification_roles) >= 1
        and notification_roles <@ array['OWNER', 'ADMIN', 'MEMBER']::text[]
    );

notify pgrst, 'reload schema';

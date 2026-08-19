-- Account-level email and in-app channel mutes. These follow the
-- organisation, not the signed-in person.

alter table public.organisations
    add column disabled_notification_emails text[] not null default '{}'::text[],
    add column disabled_notification_in_app text[] not null default '{}'::text[];

notify pgrst, 'reload schema';

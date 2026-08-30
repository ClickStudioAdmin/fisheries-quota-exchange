-- Keep organisation membership in sync when an Auth user changes email.
-- Membership is still keyed by email. The user cannot set this themselves.

create function public.sync_organisation_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null
     and old.email is not null
     and lower(new.email) is distinct from lower(old.email) then
    update public.organisation_users
    set email = lower(new.email)
    where email = lower(old.email);
  end if;

  return new;
end;
$$;

create trigger sync_organisation_user_email
after update of email on auth.users
for each row
execute function public.sync_organisation_user_email();

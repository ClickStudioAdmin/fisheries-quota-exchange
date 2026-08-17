-- Fishery logos in public storage. Platform admins upload; anyone can view.

alter table public.fisheries
    add column logo_path text;

insert into storage.buckets (id, name, public)
values ('fishery-logos', 'fishery-logos', true)
on conflict (id) do nothing;

drop policy if exists fishery_logos_select on storage.objects;
create policy fishery_logos_select
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'fishery-logos');

drop policy if exists fishery_logos_insert on storage.objects;
create policy fishery_logos_insert
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'fishery-logos'
    and public.is_platform_admin()
);

drop policy if exists fishery_logos_update on storage.objects;
create policy fishery_logos_update
on storage.objects
for update
to authenticated
using (
    bucket_id = 'fishery-logos'
    and public.is_platform_admin()
)
with check (
    bucket_id = 'fishery-logos'
    and public.is_platform_admin()
);

drop policy if exists fishery_logos_delete on storage.objects;
create policy fishery_logos_delete
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'fishery-logos'
    and public.is_platform_admin()
);

-- Strip the DEV prefix from fixture fishery names.
-- Listing and order snapshots store the name, so they are updated too.

update public.fisheries
set name = regexp_replace(name, '^DEV[[:space:]]+', '', 'i')
where name ~* '^DEV[[:space:]]+';

update public.listings
set fishery_name = regexp_replace(fishery_name, '^DEV[[:space:]]+', '', 'i')
where fishery_name ~* '^DEV[[:space:]]+';

update public.orders
set fishery_name = regexp_replace(fishery_name, '^DEV[[:space:]]+', '', 'i')
where fishery_name ~* '^DEV[[:space:]]+';

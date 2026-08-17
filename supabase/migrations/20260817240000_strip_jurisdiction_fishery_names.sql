-- Remove a leading jurisdiction label from fishery names.
-- Listing and order snapshots store the name, so they are updated too.

create temporary table fishery_renames as
select
    fisheries.id,
    fisheries.name as old_name,
    trim(regexp_replace(
        fisheries.name,
        case jurisdictions.code
            when 'NSW' then '^(NSW|New South Wales)[[:space:]]+'
            when 'VIC' then '^(VIC|Victorian|Victoria)[[:space:]]+'
            when 'QLD' then '^(QLD|Queensland)[[:space:]]+'
            when 'SA' then '^(SA|South Australian|South Australia)[[:space:]]+'
            when 'WA' then '^(WA|Western Australian|Western Australia)[[:space:]]+'
            when 'TAS' then '^(TAS|Tasmanian|Tasmania)[[:space:]]+'
            when 'NT' then '^(NT|Northern Territory)[[:space:]]+'
            when 'CTH' then '^(CTH|Commonwealth)[[:space:]]+'
            when 'ACT' then '^(ACT|Australian Capital Territory)[[:space:]]+'
            else '^$'
        end,
        '',
        'i'
    )) as new_name
from public.fisheries
join public.jurisdictions
  on jurisdictions.id = fisheries.jurisdiction_id;

delete from fishery_renames
where new_name = ''
   or new_name is not distinct from old_name;

update public.fisheries as fisheries
set name = fishery_renames.new_name
from fishery_renames
where fisheries.id = fishery_renames.id;

update public.listings as listings
set fishery_name = fishery_renames.new_name
from fishery_renames
where listings.fishery_name = fishery_renames.old_name;

update public.orders as orders
set fishery_name = fishery_renames.new_name
from fishery_renames
where orders.fishery_name = fishery_renames.old_name;

drop table fishery_renames;

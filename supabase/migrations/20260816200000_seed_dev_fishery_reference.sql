-- Development fixtures for stocks, seasons and quota types.
-- These are NOT official regulatory records. Names are labelled DEV- for testing.

insert into public.authorities (jurisdiction_id, name)
select j.id, v.name
from (
    values
        ('CTH', 'DEV Commonwealth Fisheries Authority'),
        ('NSW', 'DEV NSW Fisheries Authority'),
        ('QLD', 'DEV QLD Fisheries Authority'),
        ('SA', 'DEV SA Fisheries Authority'),
        ('WA', 'DEV WA Fisheries Authority')
) as v(code, name)
join public.jurisdictions as j on j.code = v.code
where not exists (
    select 1 from public.authorities as a where a.name = v.name
);

insert into public.species (common_name, scientific_name)
select v.common_name, v.scientific_name
from (
    values
        ('Southern Bluefin Tuna', 'Thunnus maccoyii'),
        ('Eastern School Whiting', 'Sillago flindersi'),
        ('Tiger Prawn', 'Penaeus esculentus'),
        ('Western Rock Lobster', 'Panulirus cygnus'),
        ('Abalone', 'Haliotis rubra'),
        ('Snapper', 'Chrysophrys auratus'),
        ('Spanish Mackerel', 'Scomberomorus commerson'),
        ('Sardine', 'Sardinops sagax'),
        ('Blue Grenadier', 'Macruronus novaezelandiae'),
        ('Patagonian Toothfish', 'Dissostichus eleginoides')
) as v(common_name, scientific_name)
where not exists (
    select 1 from public.species as s where s.common_name = v.common_name
);

insert into public.fisheries (authority_id, name, code)
select a.id, v.name, v.code
from (
    values
        ('DEV Commonwealth Fisheries Authority', 'DEV Southern Bluefin Tuna Fishery', 'DEV-SBT'),
        ('DEV Commonwealth Fisheries Authority', 'DEV Northern Prawn Fishery', 'DEV-NPF'),
        ('DEV Commonwealth Fisheries Authority', 'DEV Heard Island Toothfish Fishery', 'DEV-HIMI'),
        ('DEV NSW Fisheries Authority', 'DEV NSW Ocean Trawl Fishery', 'DEV-NSW-OT'),
        ('DEV QLD Fisheries Authority', 'DEV QLD East Coast Otter Trawl', 'DEV-QLD-ECOT'),
        ('DEV SA Fisheries Authority', 'DEV SA Abalone Fishery', 'DEV-SA-AB'),
        ('DEV WA Fisheries Authority', 'DEV WA Rock Lobster Fishery', 'DEV-WA-WRL')
) as v(authority_name, name, code)
join public.authorities as a on a.name = v.authority_name
where not exists (
    select 1 from public.fisheries as f where f.code = v.code
);

insert into public.stocks (fishery_id, species_id, name)
select f.id, s.id, v.stock_name
from (
    values
        ('DEV-SBT', 'Southern Bluefin Tuna', 'Global stock'),
        ('DEV-NPF', 'Tiger Prawn', 'Gulf of Carpentaria'),
        ('DEV-NPF', 'Tiger Prawn', 'Joseph Bonaparte Gulf'),
        ('DEV-HIMI', 'Patagonian Toothfish', 'Heard Island plateau'),
        ('DEV-HIMI', 'Patagonian Toothfish', 'McDonald Islands'),
        ('DEV-NSW-OT', 'Eastern School Whiting', 'Northern zone'),
        ('DEV-NSW-OT', 'Eastern School Whiting', 'Southern zone'),
        ('DEV-NSW-OT', 'Snapper', 'Inshore'),
        ('DEV-QLD-ECOT', 'Tiger Prawn', 'Northern trawl grounds'),
        ('DEV-QLD-ECOT', 'Tiger Prawn', 'Southern trawl grounds'),
        ('DEV-QLD-ECOT', 'Spanish Mackerel', 'East coast'),
        ('DEV-SA-AB', 'Abalone', 'Western zone'),
        ('DEV-SA-AB', 'Abalone', 'Central zone'),
        ('DEV-SA-AB', 'Abalone', 'Southern zone'),
        ('DEV-WA-WRL', 'Western Rock Lobster', 'Zone A'),
        ('DEV-WA-WRL', 'Western Rock Lobster', 'Zone B'),
        ('DEV-WA-WRL', 'Western Rock Lobster', 'Zone C')
) as v(fishery_code, species_name, stock_name)
join public.fisheries as f on f.code = v.fishery_code
join public.species as s on s.common_name = v.species_name
where not exists (
    select 1
    from public.stocks as st
    where st.fishery_id = f.id
      and st.species_id = s.id
      and st.name = v.stock_name
);

insert into public.seasons (fishery_id, name, starts_on, ends_on)
select f.id, v.season_name, v.starts_on::date, v.ends_on::date
from (
    values
        ('DEV-SBT', '2024-25', '2024-12-01', '2025-11-30'),
        ('DEV-SBT', '2025-26', '2025-12-01', '2026-11-30'),
        ('DEV-SBT', '2026-27', '2026-12-01', '2027-11-30'),
        ('DEV-NPF', '2024', '2024-04-01', '2024-12-15'),
        ('DEV-NPF', '2025', '2025-04-01', '2025-12-15'),
        ('DEV-NPF', '2026', '2026-04-01', '2026-12-15'),
        ('DEV-HIMI', '2024-25', '2024-12-01', '2025-11-30'),
        ('DEV-HIMI', '2025-26', '2025-12-01', '2026-11-30'),
        ('DEV-HIMI', '2026-27', '2026-12-01', '2027-11-30'),
        ('DEV-NSW-OT', '2024-25', '2024-07-01', '2025-06-30'),
        ('DEV-NSW-OT', '2025-26', '2025-07-01', '2026-06-30'),
        ('DEV-NSW-OT', '2026-27', '2026-07-01', '2027-06-30'),
        ('DEV-QLD-ECOT', '2024-25', '2024-03-01', '2025-02-28'),
        ('DEV-QLD-ECOT', '2025-26', '2025-03-01', '2026-02-28'),
        ('DEV-QLD-ECOT', '2026-27', '2026-03-01', '2027-02-28'),
        ('DEV-SA-AB', '2024-25', '2024-09-01', '2025-08-31'),
        ('DEV-SA-AB', '2025-26', '2025-09-01', '2026-08-31'),
        ('DEV-SA-AB', '2026-27', '2026-09-01', '2027-08-31'),
        ('DEV-WA-WRL', '2024-25', '2024-11-15', '2025-06-30'),
        ('DEV-WA-WRL', '2025-26', '2025-11-15', '2026-06-30'),
        ('DEV-WA-WRL', '2026-27', '2026-11-15', '2027-06-30')
) as v(fishery_code, season_name, starts_on, ends_on)
join public.fisheries as f on f.code = v.fishery_code
where not exists (
    select 1
    from public.seasons as se
    where se.fishery_id = f.id
      and se.name = v.season_name
);

insert into public.quota_types (fishery_id, measurement_kind, name, unit_label)
select f.id, v.measurement_kind, v.type_name, v.unit_label
from (
    values
        ('DEV-SBT', 'WEIGHT', 'Statutory fishing right', 'kg'),
        ('DEV-SBT', 'UNITS', 'SFR units', 'units'),
        ('DEV-NPF', 'WEIGHT', 'Tiger prawn catch quota', 'kg'),
        ('DEV-NPF', 'EFFORT', 'Boat nights', 'nights'),
        ('DEV-HIMI', 'WEIGHT', 'Toothfish catch allocation', 'kg'),
        ('DEV-HIMI', 'OTHER', 'Research allocation', 'kg-research'),
        ('DEV-NSW-OT', 'WEIGHT', 'Whiting catch quota', 'kg'),
        ('DEV-NSW-OT', 'UNITS', 'Share class units', 'shares'),
        ('DEV-QLD-ECOT', 'WEIGHT', 'Prawn catch quota', 'kg'),
        ('DEV-QLD-ECOT', 'EFFORT', 'Effort units', 'nights'),
        ('DEV-SA-AB', 'WEIGHT', 'Abalone meat weight', 'kg'),
        ('DEV-SA-AB', 'UNITS', 'Pot licences', 'licences'),
        ('DEV-WA-WRL', 'UNITS', 'Pot units', 'pots'),
        ('DEV-WA-WRL', 'WEIGHT', 'Whole weight equivalent', 'kg'),
        ('DEV-WA-WRL', 'EFFORT', 'Pot lifts', 'lifts')
) as v(fishery_code, measurement_kind, type_name, unit_label)
join public.fisheries as f on f.code = v.fishery_code
where not exists (
    select 1
    from public.quota_types as qt
    where qt.fishery_id = f.id
      and qt.name = v.type_name
);

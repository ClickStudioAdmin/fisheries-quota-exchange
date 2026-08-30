-- Remove authorities. Fisheries and species belong to a jurisdiction.
-- A species used in more than one jurisdiction is copied so each stock
-- keeps a species row in the same jurisdiction as its fishery.

alter table public.fisheries
    add column jurisdiction_id bigint references public.jurisdictions (id) on delete restrict;

update public.fisheries as fisheries
set jurisdiction_id = authorities.jurisdiction_id
from public.authorities as authorities
where authorities.id = fisheries.authority_id;

alter table public.fisheries
    alter column jurisdiction_id set not null;

alter table public.fisheries
    drop column authority_id;

alter table public.species
    add column jurisdiction_id bigint references public.jurisdictions (id) on delete restrict;

create temporary table species_jurisdiction_usage as
select distinct stocks.species_id, fisheries.jurisdiction_id
from public.stocks as stocks
join public.fisheries as fisheries on fisheries.id = stocks.fishery_id;

update public.species as species
set jurisdiction_id = assigned.jurisdiction_id
from (
    select species_id, min(jurisdiction_id) as jurisdiction_id
    from species_jurisdiction_usage
    group by species_id
) as assigned
where species.id = assigned.species_id;

insert into public.species (common_name, scientific_name, jurisdiction_id)
select species.common_name, species.scientific_name, usage.jurisdiction_id
from public.species as species
join species_jurisdiction_usage as usage on usage.species_id = species.id
where usage.jurisdiction_id is distinct from species.jurisdiction_id;

update public.stocks as stocks
set species_id = matched.id
from public.fisheries as fisheries,
     public.species as original,
     public.species as matched
where stocks.fishery_id = fisheries.id
  and original.id = stocks.species_id
  and matched.common_name = original.common_name
  and matched.jurisdiction_id = fisheries.jurisdiction_id
  and stocks.species_id is distinct from matched.id;

update public.species
set jurisdiction_id = coalesce(
    (select id from public.jurisdictions where code = 'CTH'),
    (select id from public.jurisdictions order by id limit 1)
)
where jurisdiction_id is null;

alter table public.species
    alter column jurisdiction_id set not null;

alter table public.species
    add constraint species_jurisdiction_common_name_unique
    unique (jurisdiction_id, common_name);

drop table species_jurisdiction_usage;

drop policy if exists authorities_select on public.authorities;
drop policy if exists authorities_write on public.authorities;
drop table public.authorities;

create function public.enforce_stock_species_jurisdiction()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_fishery_jurisdiction bigint;
    v_species_jurisdiction bigint;
begin
    select jurisdiction_id into v_fishery_jurisdiction
    from public.fisheries
    where id = new.fishery_id;

    select jurisdiction_id into v_species_jurisdiction
    from public.species
    where id = new.species_id;

    if v_fishery_jurisdiction is distinct from v_species_jurisdiction then
        raise exception 'Species must belong to the same jurisdiction as the fishery';
    end if;

    return new;
end;
$$;

create trigger stocks_jurisdiction_check
before insert or update on public.stocks
for each row
execute function public.enforce_stock_species_jurisdiction();

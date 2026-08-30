-- Fisheries already identify the managed resource. Drop species and keep
-- stocks as named areas within a fishery.

update public.stocks as stocks
set name = species.common_name || ' — ' || stocks.name
from public.species as species
where species.id = stocks.species_id
  and (
      select count(*)
      from public.stocks as other
      where other.fishery_id = stocks.fishery_id
        and other.name = stocks.name
  ) > 1;

drop trigger if exists stocks_jurisdiction_check on public.stocks;
drop function if exists public.enforce_stock_species_jurisdiction();

alter table public.stocks
    drop constraint if exists stocks_fishery_species_name_unique;

alter table public.stocks
    drop column species_id;

alter table public.stocks
    add constraint stocks_fishery_name_unique unique (fishery_id, name);

drop policy if exists species_select on public.species;
drop policy if exists species_write on public.species;
drop table public.species;

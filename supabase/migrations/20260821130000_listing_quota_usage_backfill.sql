-- Complete unused/used on listings and orders seeded before those columns
-- existed. Queensland rows default to unused = quantity and used = 0.
-- Non-Queensland rows stay null.

update public.listings as listings
set
    unused_quantity = listings.quantity,
    used_quantity = 0
from public.quota_holdings as holdings
join public.fisheries as fisheries
  on fisheries.id = holdings.fishery_id
join public.jurisdictions as jurisdictions
  on jurisdictions.id = fisheries.jurisdiction_id
where holdings.id = listings.holding_id
  and jurisdictions.code = 'QLD'
  and (
      listings.unused_quantity is null
      or listings.used_quantity is null
  );

update public.listings as listings
set
    unused_quantity = null,
    used_quantity = null
from public.quota_holdings as holdings
join public.fisheries as fisheries
  on fisheries.id = holdings.fishery_id
join public.jurisdictions as jurisdictions
  on jurisdictions.id = fisheries.jurisdiction_id
where holdings.id = listings.holding_id
  and jurisdictions.code is distinct from 'QLD'
  and (
      listings.unused_quantity is not null
      or listings.used_quantity is not null
  );

update public.orders as orders
set
    unused_quantity = listings.unused_quantity,
    used_quantity = listings.used_quantity
from public.listings as listings
where listings.id = orders.listing_id
  and (
      orders.unused_quantity is distinct from listings.unused_quantity
      or orders.used_quantity is distinct from listings.used_quantity
  );

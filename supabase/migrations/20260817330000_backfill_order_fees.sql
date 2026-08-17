-- Snapshot platform fees onto orders that were created before fees existed.
-- New orders still get fee_percent and fee_amount_aud from the insert trigger.

update public.orders as orders
set
    fee_percent = fees.percent,
    fee_amount_aud = round(orders.amount_aud * fees.percent / 100.0, 2)
from (
    select
        kinds.offering,
        public.platform_fee_percent(kinds.offering) as percent
    from (
        values
            ('SALE'::text),
            ('LEASE'::text)
    ) as kinds(offering)
) as fees
where orders.offering = fees.offering
  and orders.fee_percent = 0
  and orders.fee_amount_aud = 0
  and fees.percent > 0;

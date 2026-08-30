-- Split settled-order in-app copy so sellers are not told they received the
-- quota invoice (buyer payment). Buyers are not told they received the fee invoice.

update public.user_notifications
set body = regexp_replace(
    body,
    'Dummy tax invoices are attached: quota \(seller to buyer\) and platform fee \(FQX to you\)\.',
    'A dummy platform fee tax invoice is on the order (FQX to you). It is not a real tax invoice.'
)
where template = 'order_settled'
  and body like '%quota (seller to buyer)%';

update public.user_notifications
set body = regexp_replace(
    body,
    'Dummy tax invoices are attached: quota \(seller to you\) and the platform fee invoice \(FQX to the seller\)\.',
    'A dummy quota tax invoice is on the order (seller to you). It is not a real tax invoice.'
)
where template = 'order_settled'
  and body like '%platform fee invoice (FQX to the seller)%';

update public.user_notifications
set body = regexp_replace(
    body,
    E'\\n\\nQuota total [^\\n]*These are not real tax invoices\\.',
    ''
)
where template = 'order_settled'
  and body like '%platform fee tax invoice%'
  and body like '%Quota total%';

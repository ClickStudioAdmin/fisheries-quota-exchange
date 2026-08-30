insert into public.transfer_form_templates (
    jurisdiction_id,
    offering,
    form_type,
    form_version,
    title,
    active
)
select
    j.id,
    'SALE',
    'FDU1465',
    'V09/23',
    'Permanent transfer of quota and/or effort units (FDU1465)',
    true
from public.jurisdictions as j
where j.code = 'QLD'
on conflict (jurisdiction_id, offering, form_type, form_version) do update
set
    title = excluded.title,
    active = true;

update public.transfer_form_templates
set active = false
where form_type = 'FDU1465'
  and form_version = 'V02/26';

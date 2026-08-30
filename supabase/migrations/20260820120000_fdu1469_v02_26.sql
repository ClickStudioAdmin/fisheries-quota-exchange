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
    'LEASE',
    'FDU1469',
    'V02/26',
    'Temporary transfer of quota and/or effort units (FDU1469)',
    true
from public.jurisdictions as j
where j.code = 'QLD'
on conflict (jurisdiction_id, offering, form_type, form_version) do update
set
    title = excluded.title,
    active = true;

update public.transfer_form_templates
set active = false
where form_type = 'FDU_LEASE'
  and form_version = 'V01/26';

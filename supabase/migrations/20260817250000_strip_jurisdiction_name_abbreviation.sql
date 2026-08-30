-- Remove a leading abbreviation/code from jurisdiction names, e.g.
-- "NSW — New South Wales" → "New South Wales".

update public.jurisdictions
set name = trim(regexp_replace(
    name,
    '^' || code || '([[:space:]]+[—\-–:]*[[:space:]]*|[—\-–:]+[[:space:]]*)',
    '',
    'i'
))
where name ~* ('^' || code || '([[:space:]]+|[—\-–:])')
  and trim(regexp_replace(
    name,
    '^' || code || '([[:space:]]+[—\-–:]*[[:space:]]*|[—\-–:]+[[:space:]]*)',
    '',
    'i'
  )) <> '';

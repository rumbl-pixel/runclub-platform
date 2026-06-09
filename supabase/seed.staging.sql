-- Gwynne Park Run Club Staging seed.
-- FAKE DATA ONLY. Do not add real student names or identifiers here.

insert into public.schools (id, name, slug)
values ('10000000-0000-4000-8000-000000000001', 'Gwynne Park Run Club Staging', 'gwynne-park-staging')
on conflict (slug) do update set name = excluded.name;

insert into public.students (
  id, school_id, barcode, first_name, last_name, preferred_name, year_group, class_name, active
) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'STAGING1', 'Staging', 'Runnerone', 'Staging Runner 1', '5', '5A', true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'STAGING2', 'Staging', 'Runnertwo', 'Staging Runner 2', '3', '3B', true)
on conflict (school_id, barcode) do update set
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  preferred_name = excluded.preferred_name,
  year_group = excluded.year_group,
  class_name = excluded.class_name,
  active = excluded.active;

insert into public.devices (id, school_id, name, location, device_type, active)
values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Staging Scanner', 'Test Track', 'scanner', true)
on conflict (id) do update set
  name = excluded.name,
  location = excluded.location,
  active = excluded.active;

-- Priority 3 sync, reporting, backup, and migration support.
-- Complements the initial RLS schema with idempotent scan writes and report views.

create table if not exists public.backup_exports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  export_kind text not null default 'manual',
  status text not null default 'created' check (status in ('created','running','complete','failed')),
  storage_path text,
  row_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.demo_data_imports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  source text not null default 'browser-localStorage',
  payload jsonb not null,
  status text not null default 'received' check (status in ('received','validated','imported','failed')),
  conflict_count integer not null default 0,
  created_at timestamptz not null default now(),
  imported_at timestamptz,
  created_by uuid references public.app_users(id) on delete set null
);

alter table public.backup_exports enable row level security;
alter table public.demo_data_imports enable row level security;

create policy "staff can view backup exports"
on public.backup_exports for select
using (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can create backup exports"
on public.backup_exports for insert
with check (public.user_has_school_role(school_id, array['owner','admin']));

create policy "staff can view demo data imports"
on public.demo_data_imports for select
using (public.user_has_school_role(school_id, array['owner','admin']));

create policy "staff can create demo data imports"
on public.demo_data_imports for insert
with check (public.user_has_school_role(school_id, array['owner','admin']));

create or replace function public.record_lap_scan(
  p_school_id uuid,
  p_student_id uuid,
  p_session_id uuid,
  p_device_id uuid,
  p_idempotency_key text,
  p_lap_distance_km numeric,
  p_source text,
  p_barcode text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  lap_entry_id uuid,
  outcome text,
  conflict boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  inserted_id uuid;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;

  select id into existing_id
  from public.lap_entries
  where school_id = p_school_id
    and idempotency_key = p_idempotency_key
  limit 1;

  if existing_id is not null then
    insert into public.scan_audit_logs (
      school_id, student_id, session_id, device_id, barcode, source, success, duplicate, message, metadata
    ) values (
      p_school_id, p_student_id, p_session_id, p_device_id, p_barcode, p_source, false, true, 'Duplicate idempotency_key conflict', p_metadata || jsonb_build_object('idempotency_key', p_idempotency_key, 'conflict', true)
    );
    return query select existing_id, 'conflict'::text, true;
    return;
  end if;

  insert into public.lap_entries (
    school_id, student_id, session_id, device_id, idempotency_key, lap_distance_km, source
  ) values (
    p_school_id, p_student_id, p_session_id, p_device_id, p_idempotency_key, coalesce(p_lap_distance_km, 0.25), coalesce(p_source, 'scanner')
  )
  returning id into inserted_id;

  insert into public.scan_audit_logs (
    school_id, student_id, session_id, device_id, barcode, source, success, duplicate, message, metadata
  ) values (
    p_school_id, p_student_id, p_session_id, p_device_id, p_barcode, coalesce(p_source, 'scanner'), true, false, 'Lap logged', p_metadata || jsonb_build_object('idempotency_key', p_idempotency_key)
  );

  return query select inserted_id, 'logged'::text, false;
end;
$$;

create or replace view public.leaderboard_totals as
select
  s.school_id,
  s.id as student_id,
  s.barcode,
  coalesce(s.preferred_name, concat_ws(' ', s.first_name, s.last_name)) as student_name,
  s.year_group,
  s.class_name,
  count(l.id) filter (where l.undone_at is null) as total_laps,
  coalesce(sum(l.lap_distance_km) filter (where l.undone_at is null), 0)::numeric(10,2) as total_km,
  max(l.scanned_at) as last_scanned_at
from public.students s
left join public.lap_entries l on l.student_id = s.id and l.school_id = s.school_id
where s.active = true
group by s.school_id, s.id, s.barcode, s.preferred_name, s.first_name, s.last_name, s.year_group, s.class_name;

create or replace view public.student_progress_summary as
select
  school_id,
  student_id,
  student_name,
  year_group,
  class_name,
  total_laps,
  total_km,
  last_scanned_at,
  case
    when last_scanned_at is null then 'inactive'
    when last_scanned_at < now() - interval '30 days' then 'needs_attention'
    else 'active'
  end as participation_status
from public.leaderboard_totals;

-- Gwynne Park Run Club initial production schema.
-- Privacy posture: every student/school data table enables RLS in this first migration.

create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_users (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null check (role in ('owner','admin','coach','parent','student')),
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  group_type text not null check (group_type in ('class','year','division','house','training','other')),
  created_at timestamptz not null default now(),
  unique (school_id, group_type, name)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  barcode text not null,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  year_group text not null,
  class_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, barcode)
);

create table if not exists public.student_groups (
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, group_id)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  location text,
  device_type text not null default 'scanner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.run_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  session_type text not null default 'Run Club',
  notes text,
  lap_distance_km numeric(8,3) not null default 0.25,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.lap_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid references public.run_sessions(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  idempotency_key text not null,
  lap_distance_km numeric(8,3) not null default 0.25,
  source text not null default 'scanner',
  scanned_at timestamptz not null default now(),
  undone_at timestamptz,
  undo_reason text,
  created_by uuid references public.app_users(id) on delete set null,
  unique (school_id, idempotency_key)
);

create table if not exists public.scan_audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  session_id uuid references public.run_sessions(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  barcode text,
  source text not null,
  success boolean not null default false,
  duplicate boolean not null default false,
  undo boolean not null default false,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  award_type text not null,
  title text not null,
  milestone_value numeric(10,2),
  awarded_at timestamptz not null default now(),
  printed_at timestamptz,
  created_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  goal_description text,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  owner text not null check (owner in ('student','coach')),
  metric text not null,
  title text not null,
  target numeric(10,2) not null,
  unit text not null,
  baseline_value numeric(10,2),
  deadline date,
  completed_after_session_id uuid references public.run_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.training_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  url text not null,
  notes text,
  due_date date,
  created_at timestamptz not null default now(),
  created_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.training_assignment_students (
  assignment_id uuid not null references public.training_assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

create table if not exists public.training_link_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  assignment_id uuid not null references public.training_assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  opened_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_school_users_user on public.school_users(user_id);
create index if not exists idx_students_school on public.students(school_id);
create index if not exists idx_lap_entries_student on public.lap_entries(student_id, scanned_at desc);
create index if not exists idx_lap_entries_session on public.lap_entries(session_id);
create index if not exists idx_scan_audit_school_time on public.scan_audit_logs(school_id, created_at desc);
create index if not exists idx_training_assignment_students_student on public.training_assignment_students(student_id);
create index if not exists idx_training_link_events_assignment_student on public.training_link_events(assignment_id, student_id, opened_at desc);

alter table public.schools enable row level security;
alter table public.app_users enable row level security;
alter table public.school_users enable row level security;
alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.student_groups enable row level security;
alter table public.devices enable row level security;
alter table public.run_sessions enable row level security;
alter table public.lap_entries enable row level security;
alter table public.scan_audit_logs enable row level security;
alter table public.awards enable row level security;
alter table public.challenges enable row level security;
alter table public.goals enable row level security;
alter table public.training_assignments enable row level security;
alter table public.training_assignment_students enable row level security;
alter table public.training_link_events enable row level security;

create or replace function public.user_school_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id
  from public.school_users
  where user_id = auth.uid()
$$;

create or replace function public.user_has_school_role(target_school_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_users
    where user_id = auth.uid()
      and school_id = target_school_id
      and role = any(allowed_roles)
  )
$$;

create policy "school members can view their schools"
on public.schools for select
using (id in (select public.user_school_ids()));

create policy "users can view their own profile"
on public.app_users for select
using (id = auth.uid());

create policy "school members can view school users"
on public.school_users for select
using (school_id in (select public.user_school_ids()));

create policy "staff can manage groups"
on public.groups for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "school members can view groups"
on public.groups for select
using (school_id in (select public.user_school_ids()));

create policy "staff can manage students"
on public.students for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "school members can view students"
on public.students for select
using (school_id in (select public.user_school_ids()));

create policy "staff can manage student groups"
on public.student_groups for all
using (
  exists (
    select 1 from public.students s
    where s.id = student_id
      and public.user_has_school_role(s.school_id, array['owner','admin','coach'])
  )
)
with check (
  exists (
    select 1 from public.students s
    where s.id = student_id
      and public.user_has_school_role(s.school_id, array['owner','admin','coach'])
  )
);

create policy "staff can manage devices"
on public.devices for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage run sessions"
on public.run_sessions for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage lap entries"
on public.lap_entries for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can view scan audit logs"
on public.scan_audit_logs for select
using (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can create scan audit logs"
on public.scan_audit_logs for insert
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage awards"
on public.awards for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage challenges"
on public.challenges for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage goals"
on public.goals for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage training assignments"
on public.training_assignments for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage training assignment students"
on public.training_assignment_students for all
using (
  exists (
    select 1
    from public.training_assignments ta
    where ta.id = assignment_id
      and public.user_has_school_role(ta.school_id, array['owner','admin','coach'])
  )
)
with check (
  exists (
    select 1
    from public.training_assignments ta
    where ta.id = assignment_id
      and public.user_has_school_role(ta.school_id, array['owner','admin','coach'])
  )
);

create policy "staff can view training link events"
on public.training_link_events for select
using (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can create training link events"
on public.training_link_events for insert
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

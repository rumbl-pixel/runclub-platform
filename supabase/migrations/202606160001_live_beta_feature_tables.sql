-- Live beta feature tables for Sports, Coach Tools, student notifications, and staff invite audit.
-- Privacy posture: every table is school-scoped and RLS protected before browser access.

create table if not exists public.athletics_team_selections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  event_id text not null,
  student_id uuid not null references public.students(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  selected_by uuid references public.app_users(id) on delete set null,
  selected_at timestamptz not null default now(),
  unique (school_id, event_id, student_id)
);

create table if not exists public.athletics_results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  event_id text not null,
  event_name text not null,
  event_category text not null,
  measure text not null,
  result_value text not null,
  result_number numeric(10,3),
  house text,
  place text,
  points integer not null default 0,
  personal_best boolean not null default false,
  result_date date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cross_country_courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  course_key text not null,
  name text not null,
  distance_m integer not null check (distance_m > 0),
  division text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references public.app_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (school_id, course_key)
);

create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  tool text not null,
  scope text not null,
  note text not null,
  staff_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','admin','coach')),
  status text not null default 'planned' check (status in ('planned','sent','accepted','revoked')),
  metadata jsonb not null default '{}'::jsonb,
  invited_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, email, role)
);

create index if not exists idx_athletics_team_selections_school_event
on public.athletics_team_selections(school_id, event_id);

create index if not exists idx_athletics_team_selections_student
on public.athletics_team_selections(student_id);

create index if not exists idx_athletics_results_school_event
on public.athletics_results(school_id, event_id, result_date desc);

create index if not exists idx_athletics_results_student
on public.athletics_results(student_id, result_date desc);

create index if not exists idx_cross_country_courses_school
on public.cross_country_courses(school_id, active);

create index if not exists idx_coach_notes_school_tool
on public.coach_notes(school_id, tool, created_at desc);

create index if not exists idx_student_notifications_student
on public.student_notifications(student_id, created_at desc);

create index if not exists idx_staff_invites_school_status
on public.staff_invites(school_id, status);

alter table public.athletics_team_selections enable row level security;
alter table public.athletics_results enable row level security;
alter table public.cross_country_courses enable row level security;
alter table public.coach_notes enable row level security;
alter table public.student_notifications enable row level security;
alter table public.staff_invites enable row level security;

create policy "staff can manage athletics team selections"
on public.athletics_team_selections for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage athletics results"
on public.athletics_results for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage cross country courses"
on public.cross_country_courses for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage coach notes"
on public.coach_notes for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage student notifications"
on public.student_notifications for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create policy "staff can manage staff invites"
on public.staff_invites for all
using (public.user_has_school_role(school_id, array['owner','admin']))
with check (public.user_has_school_role(school_id, array['owner','admin']));

create or replace function public.set_athletics_consent_status(
  p_school_id uuid,
  p_student_id uuid default null,
  p_barcode text default '',
  p_status text default 'pending',
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  student_id uuid,
  consent_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student public.students;
  saved_status text;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;

  saved_status := lower(coalesce(nullif(trim(p_status), ''), 'pending'));
  if saved_status = 'approved' then
    saved_status := 'granted';
  end if;
  if saved_status not in ('pending','granted','declined') then
    raise exception 'invalid athletics consent status';
  end if;

  select *
  into target_student
  from public.students
  where school_id = p_school_id
    and active = true
    and (
      (p_student_id is not null and id = p_student_id)
      or (coalesce(p_barcode, '') <> '' and barcode = p_barcode)
    )
  limit 1;

  if target_student.id is null then
    raise exception 'student not found';
  end if;

  update public.students
  set consent_status = saved_status,
      updated_at = now()
  where id = target_student.id;

  insert into public.scan_audit_logs (
    school_id, student_id, barcode, source, success, duplicate, undo, message, metadata
  ) values (
    p_school_id,
    target_student.id,
    target_student.barcode,
    'athletics-consent',
    true,
    false,
    false,
    'Athletics consent status updated',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('consent_status', saved_status)
  );

  return query select target_student.id, saved_status;
end;
$$;

create or replace function public.save_athletics_team_selection(
  p_school_id uuid,
  p_event_id text,
  p_student_ids uuid[],
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  event_id text,
  selected_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_count integer;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;
  if coalesce(trim(p_event_id), '') = '' then
    raise exception 'event id is required';
  end if;

  delete from public.athletics_team_selections
  where school_id = p_school_id
    and event_id = p_event_id;

  insert into public.athletics_team_selections (
    school_id, event_id, student_id, metadata, selected_by
  )
  select p_school_id, p_event_id, s.id, coalesce(p_metadata, '{}'::jsonb), auth.uid()
  from public.students s
  where s.school_id = p_school_id
    and s.active = true
    and s.id = any(coalesce(p_student_ids, array[]::uuid[]))
  on conflict do nothing;

  select count(*) into saved_count
  from public.athletics_team_selections
  where school_id = p_school_id
    and event_id = p_event_id;

  insert into public.scan_audit_logs (
    school_id, source, success, duplicate, undo, message, metadata
  ) values (
    p_school_id,
    'athletics-team-selection',
    true,
    false,
    false,
    'Athletics team selection saved',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('event_id', p_event_id, 'selected_count', saved_count)
  );

  return query select p_event_id, saved_count;
end;
$$;

create or replace function public.record_athletics_result(
  p_school_id uuid,
  p_student_id uuid,
  p_event_id text,
  p_event_name text,
  p_event_category text,
  p_measure text,
  p_result_value text,
  p_result_number numeric,
  p_house text default '',
  p_place text default '',
  p_points integer default 0,
  p_personal_best boolean default false,
  p_result_date date default current_date,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  result_id uuid,
  personal_best boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.students
    where id = p_student_id
      and school_id = p_school_id
      and active = true
  ) then
    raise exception 'student not found';
  end if;

  insert into public.athletics_results (
    school_id, student_id, event_id, event_name, event_category, measure,
    result_value, result_number, house, place, points, personal_best,
    result_date, metadata, created_by
  ) values (
    p_school_id, p_student_id, p_event_id, p_event_name, p_event_category, p_measure,
    p_result_value, p_result_number, nullif(trim(coalesce(p_house, '')), ''),
    nullif(trim(coalesce(p_place, '')), ''), coalesce(p_points, 0), coalesce(p_personal_best, false),
    coalesce(p_result_date, current_date), coalesce(p_metadata, '{}'::jsonb), auth.uid()
  )
  returning id into inserted_id;

  return query select inserted_id, coalesce(p_personal_best, false);
end;
$$;

create or replace function public.save_cross_country_course(
  p_school_id uuid,
  p_course_key text,
  p_name text,
  p_distance_m integer,
  p_division text default '',
  p_active boolean default true,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  course_id uuid,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.cross_country_courses;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'course name is required';
  end if;
  if coalesce(p_distance_m, 0) <= 0 then
    raise exception 'course distance is required';
  end if;

  insert into public.cross_country_courses (
    school_id, course_key, name, distance_m, division, active, metadata, updated_by, updated_at
  ) values (
    p_school_id,
    coalesce(nullif(trim(p_course_key), ''), lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'))),
    p_name,
    p_distance_m,
    nullif(trim(coalesce(p_division, '')), ''),
    coalesce(p_active, true),
    coalesce(p_metadata, '{}'::jsonb),
    auth.uid(),
    now()
  )
  on conflict (school_id, course_key) do update set
    name = excluded.name,
    distance_m = excluded.distance_m,
    division = excluded.division,
    active = excluded.active,
    metadata = excluded.metadata,
    updated_by = auth.uid(),
    updated_at = now()
  returning * into saved;

  return query select saved.id, saved.name;
end;
$$;

create or replace function public.save_coach_note(
  p_school_id uuid,
  p_tool text,
  p_scope text,
  p_note text,
  p_staff_label text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  coach_note_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'note is required';
  end if;

  insert into public.coach_notes (
    school_id, tool, scope, note, staff_label, metadata, created_by
  ) values (
    p_school_id,
    coalesce(nullif(trim(p_tool), ''), 'coach-tools'),
    coalesce(nullif(trim(p_scope), ''), 'general'),
    trim(p_note),
    nullif(trim(coalesce(p_staff_label, '')), ''),
    coalesce(p_metadata, '{}'::jsonb),
    auth.uid()
  )
  returning id into inserted_id;

  return query select inserted_id;
end;
$$;

create or replace function public.create_student_notification(
  p_school_id uuid,
  p_student_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  notification_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.students
    where id = p_student_id
      and school_id = p_school_id
      and active = true
  ) then
    raise exception 'student not found';
  end if;

  insert into public.student_notifications (
    school_id, student_id, notification_type, title, message, metadata, created_by
  ) values (
    p_school_id,
    p_student_id,
    coalesce(nullif(trim(p_notification_type), ''), 'coach-reminder'),
    coalesce(nullif(trim(p_title), ''), 'Coach reminder'),
    coalesce(nullif(trim(p_message), ''), 'Check your run club profile.'),
    coalesce(p_metadata, '{}'::jsonb),
    auth.uid()
  )
  returning id into inserted_id;

  return query select inserted_id;
end;
$$;

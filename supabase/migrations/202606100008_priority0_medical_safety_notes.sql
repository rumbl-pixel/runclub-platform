-- Priority 0: guarded student medical safety notes.
-- Health information is sensitive; keep it out of public leaderboards and general exports.

create table if not exists public.student_medical_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  asthma text,
  anaphylaxis text,
  medication text,
  emergency_note text,
  health_plan_supplied boolean not null default false,
  reviewed_at date,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references public.app_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (school_id, student_id)
);

create index if not exists idx_student_medical_notes_school_student
on public.student_medical_notes(school_id, student_id);

alter table public.student_medical_notes enable row level security;

drop policy if exists "staff can view medical safety notes" on public.student_medical_notes;
create policy "staff can view medical safety notes"
on public.student_medical_notes for select
using (public.user_has_school_role(school_id, array['owner','admin','coach']));

drop policy if exists "staff can manage medical safety notes" on public.student_medical_notes;
create policy "staff can manage medical safety notes"
on public.student_medical_notes for all
using (public.user_has_school_role(school_id, array['owner','admin','coach']))
with check (public.user_has_school_role(school_id, array['owner','admin','coach']));

create or replace function public.set_student_medical_notes(
  p_school_id uuid,
  p_student_id uuid default null,
  p_barcode text default '',
  p_asthma text default '',
  p_anaphylaxis text default '',
  p_medication text default '',
  p_emergency_note text default '',
  p_health_plan_supplied boolean default false,
  p_reviewed_at date default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.student_medical_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student public.students;
  saved public.student_medical_notes;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'Not authorised to update medical safety notes';
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
    raise exception 'Student not found for medical safety notes';
  end if;

  insert into public.student_medical_notes (
    school_id,
    student_id,
    asthma,
    anaphylaxis,
    medication,
    emergency_note,
    health_plan_supplied,
    reviewed_at,
    metadata,
    updated_by,
    updated_at
  ) values (
    p_school_id,
    target_student.id,
    nullif(trim(coalesce(p_asthma, '')), ''),
    nullif(trim(coalesce(p_anaphylaxis, '')), ''),
    nullif(trim(coalesce(p_medication, '')), ''),
    nullif(trim(coalesce(p_emergency_note, '')), ''),
    coalesce(p_health_plan_supplied, false),
    p_reviewed_at,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'medical-note'),
    auth.uid(),
    now()
  )
  on conflict (school_id, student_id) do update set
    asthma = excluded.asthma,
    anaphylaxis = excluded.anaphylaxis,
    medication = excluded.medication,
    emergency_note = excluded.emergency_note,
    health_plan_supplied = excluded.health_plan_supplied,
    reviewed_at = excluded.reviewed_at,
    metadata = excluded.metadata,
    updated_by = auth.uid(),
    updated_at = now()
  returning * into saved;

  insert into public.scan_audit_logs (
    school_id,
    student_id,
    barcode,
    source,
    success,
    duplicate,
    undo,
    message,
    metadata
  ) values (
    p_school_id,
    target_student.id,
    target_student.barcode,
    'medical-note',
    true,
    false,
    false,
    'Medical safety notes updated',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'medical-note')
  );

  return saved;
end;
$$;

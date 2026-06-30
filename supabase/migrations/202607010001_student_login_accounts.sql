-- Student login accounts.
-- Adds username + auth account link to students so a student can sign in with
-- a kid-friendly username (FirstName + LastInitial + number) and their own
-- per-student password, then read ONLY their own record and progress.
--
-- Privacy posture:
--   * Students are intentionally NOT added to school_users. If they were, the
--     existing "school members can view students" policy would expose every
--     classmate's record. Instead we link auth.users -> students.user_id and
--     grant student-self access through dedicated, read-only policies.
--   * Students get SELECT only. They cannot self-report activity (no insert /
--     update on lap_entries) and never see medical safety notes (those policies
--     live in 202606100008 and are left untouched).
--   * Barcodes remain lap-tracking identifiers only and are no longer a login
--     credential.

alter table public.students
  add column if not exists username text,
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- One username per school, one auth account per student.
create unique index if not exists uq_students_school_username
  on public.students(school_id, lower(username))
  where username is not null;

create unique index if not exists uq_students_user_id
  on public.students(user_id)
  where user_id is not null;

create index if not exists idx_students_user_id
  on public.students(user_id)
  where user_id is not null;

-- Student id(s) owned by the currently authenticated user. Security definer so
-- it can read students regardless of the caller's own RLS view.
create or replace function public.current_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.students
  where user_id = auth.uid()
$$;

-- A logged-in student can read their own student record.
drop policy if exists "students can view their own record" on public.students;
create policy "students can view their own record"
on public.students for select
using (user_id = auth.uid());

-- A logged-in student can read their own awards.
drop policy if exists "students can view their own awards" on public.awards;
create policy "students can view their own awards"
on public.awards for select
using (student_id in (select public.current_student_ids()));

-- A logged-in student can read their own goals (read-only here; staff still
-- manage goal creation/edits via the existing staff policy).
drop policy if exists "students can view their own goals" on public.goals;
create policy "students can view their own goals"
on public.goals for select
using (student_id in (select public.current_student_ids()));

-- A logged-in student can read their own lap history.
drop policy if exists "students can view their own laps" on public.lap_entries;
create policy "students can view their own laps"
on public.lap_entries for select
using (student_id in (select public.current_student_ids()));

-- A logged-in student can see which training assignments are theirs.
drop policy if exists "students can view their own training links" on public.training_assignment_students;
create policy "students can view their own training links"
on public.training_assignment_students for select
using (student_id in (select public.current_student_ids()));

-- ...and read the details of training assignments assigned to them.
drop policy if exists "students can view assigned training" on public.training_assignments;
create policy "students can view assigned training"
on public.training_assignments for select
using (
  exists (
    select 1
    from public.training_assignment_students tas
    where tas.assignment_id = training_assignments.id
      and tas.student_id in (select public.current_student_ids())
  )
);

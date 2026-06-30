-- Fix guardian-link RPC column shadowing found during live security proof.
-- The RETURNS TABLE columns include student_id/status/code, so table columns must be qualified.

create or replace function public.issue_guardian_link(
  p_school_id uuid,
  p_student_id uuid,
  p_barcode text,
  p_student_name text,
  p_year_group text,
  p_class_name text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  guardian_link_id uuid,
  student_id uuid,
  code text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_student record;
  inserted record;
  next_code text;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;

  select s.*
  into resolved_student
  from public.students s
  where s.school_id = p_school_id
    and s.active = true
    and (
      s.id = p_student_id
      or (coalesce(p_barcode, '') <> '' and s.barcode = p_barcode)
    )
  limit 1;

  if resolved_student.id is null then
    raise exception 'student not found';
  end if;

  update public.guardian_links gl
  set status = 'revoked',
      updated_at = now(),
      metadata = gl.metadata || jsonb_build_object('reissued_at', now())
  where gl.school_id = p_school_id
    and gl.student_id = resolved_student.id
    and gl.status = 'active';

  next_code := public.guardian_link_code(resolved_student.barcode);

  insert into public.guardian_links (
    school_id,
    student_id,
    code,
    status,
    expires_at,
    metadata,
    created_by
  ) values (
    p_school_id,
    resolved_student.id,
    next_code,
    'active',
    now() + interval '1 year',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source', 'guardian-link',
      'student_name', coalesce(nullif(p_student_name, ''), concat_ws(' ', resolved_student.first_name, resolved_student.last_name)),
      'year_group', coalesce(nullif(p_year_group, ''), resolved_student.year_group),
      'class_name', coalesce(nullif(p_class_name, ''), resolved_student.class_name)
    ),
    auth.uid()
  )
  returning * into inserted;

  insert into public.scan_audit_logs (
    school_id, student_id, barcode, source, success, duplicate, undo, message, metadata
  ) values (
    p_school_id,
    resolved_student.id,
    resolved_student.barcode,
    'guardian-link',
    true,
    false,
    false,
    'Guardian link issued',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('guardian_link_id', inserted.id)
  );

  return query select inserted.id, inserted.student_id, inserted.code, inserted.status, inserted.expires_at;
end;
$$;

create or replace function public.set_guardian_link_status(
  p_school_id uuid,
  p_student_id uuid,
  p_code text,
  p_status text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  guardian_link_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_link record;
begin
  if p_status not in ('active','revoked') then
    raise exception 'invalid guardian link status';
  end if;

  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;

  select gl.*
  into target_link
  from public.guardian_links gl
  where gl.school_id = p_school_id
    and (
      (p_student_id is not null and gl.student_id = p_student_id)
      or (coalesce(p_code, '') <> '' and gl.code = p_code)
    )
  order by gl.created_at desc
  limit 1;

  if target_link.id is null then
    raise exception 'guardian link not found';
  end if;

  update public.guardian_links gl
  set status = p_status,
      updated_at = now(),
      metadata = gl.metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'guardian-link', 'status_changed_at', now())
  where gl.id = target_link.id
  returning * into target_link;

  insert into public.scan_audit_logs (
    school_id, student_id, barcode, source, success, duplicate, undo, message, metadata
  ) values (
    p_school_id,
    target_link.student_id,
    null,
    'guardian-link',
    true,
    false,
    false,
    'Guardian link status changed',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('guardian_link_id', target_link.id, 'status', p_status)
  );

  return query select target_link.id, target_link.status;
end;
$$;

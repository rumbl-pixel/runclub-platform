create or replace function public.record_scan_undo(
  p_school_id uuid,
  p_idempotency_key text,
  p_barcode text,
  p_reason text,
  p_source text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  lap_entry_id uuid,
  outcome text,
  undone boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_entry record;
begin
  if not public.user_has_school_role(p_school_id, array['owner','admin','coach']) then
    raise exception 'not allowed';
  end if;

  select *
  into target_entry
  from public.lap_entries
  where school_id = p_school_id
    and idempotency_key = p_idempotency_key
  limit 1;

  if target_entry.id is null then
    insert into public.scan_audit_logs (
      school_id, barcode, source, success, duplicate, undo, message, metadata
    ) values (
      p_school_id,
      p_barcode,
      coalesce(p_source, 'admin-dashboard'),
      false,
      false,
      true,
      'Undo failed: original scan not found',
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotency_key', p_idempotency_key, 'reason', p_reason)
    );
    return query select null::uuid, 'not-found'::text, false;
    return;
  end if;

  if target_entry.undone_at is not null then
    insert into public.scan_audit_logs (
      school_id, student_id, session_id, device_id, barcode, source, success, duplicate, undo, message, metadata
    ) values (
      p_school_id,
      target_entry.student_id,
      target_entry.session_id,
      target_entry.device_id,
      p_barcode,
      coalesce(p_source, 'admin-dashboard'),
      false,
      true,
      true,
      'Undo ignored: scan already undone',
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotency_key', p_idempotency_key, 'reason', p_reason)
    );
    return query select target_entry.id, 'already-undone'::text, false;
    return;
  end if;

  update public.lap_entries
  set undone_at = now(),
      undo_reason = coalesce(p_reason, 'Undo last scan')
  where id = target_entry.id;

  insert into public.scan_audit_logs (
    school_id, student_id, session_id, device_id, barcode, source, success, duplicate, undo, message, metadata
  ) values (
    p_school_id,
    target_entry.student_id,
    target_entry.session_id,
    target_entry.device_id,
    p_barcode,
    coalesce(p_source, 'admin-dashboard'),
    true,
    false,
    true,
    'Scan undone',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotency_key', p_idempotency_key, 'reason', p_reason)
  );

  return query select target_entry.id, 'undone'::text, true;
end;
$$;

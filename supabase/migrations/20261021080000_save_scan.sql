-- Saves one scan and its aggregated findings in a single transaction.
-- Runs as the caller, so the owner-scoped RLS policies still apply.

create or replace function public.save_scan(
  p_file_name text,
  p_file_type text,
  p_file_size_bytes integer,
  p_overall_risk text,
  p_findings jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scan_id uuid := gen_random_uuid();
  v_total integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  if jsonb_typeof(p_findings) <> 'array' then
    raise exception 'findings must be an array' using errcode = '22023';
  end if;

  select coalesce(sum((f->>'count')::integer), 0)
    into v_total
    from jsonb_array_elements(p_findings) as f;

  insert into public.scans (
    id, owner_id, file_name, file_type, file_size_bytes, overall_risk, total_findings
  )
  values (
    v_scan_id, auth.uid(), p_file_name, p_file_type, p_file_size_bytes, p_overall_risk, v_total
  );

  insert into public.findings (
    scan_id, owner_id, detector_type, risk, occurrence_count, masked_example
  )
  select
    v_scan_id,
    auth.uid(),
    f->>'type',
    f->>'risk',
    (f->>'count')::integer,
    f->>'maskedExample'
  from jsonb_array_elements(p_findings) as f;

  return v_scan_id;
end;
$$;

revoke all on function public.save_scan(text, text, integer, text, jsonb) from public, anon;
grant execute on function public.save_scan(text, text, integer, text, jsonb) to authenticated;

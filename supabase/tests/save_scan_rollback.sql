-- Run in the Supabase SQL Editor after the save_scan migration. Uses the oldest auth user.
-- Expects the output "rejected" notice and a PASS notice. Everything is rolled back at the end.
begin;

do $$
declare
  v_uid uuid;
  v_before integer;
  v_after integer;
  v_rejected boolean := false;
begin
  select id into v_uid from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);

  select count(*) into v_before from public.scans where owner_id = v_uid;

  begin
    perform public.save_scan(
      'rollback-check.txt', 'txt', 10, 'Low',
      '[{"type":"Email address","risk":"Bogus","count":1,"maskedExample":"x***@example.test"}]'::jsonb
    );
  exception when others then
    v_rejected := true;
    raise notice 'save_scan rejected as expected: %', sqlerrm;
  end;

  if not v_rejected then
    raise exception 'FAIL: invalid risk was accepted';
  end if;

  select count(*) into v_after from public.scans where owner_id = v_uid;
  if v_after <> v_before then
    raise exception 'FAIL: scan row left behind (before %, after %)', v_before, v_after;
  end if;

  raise notice 'PASS: failed save left no scan row (% before and after)', v_before;
end;
$$;

rollback;

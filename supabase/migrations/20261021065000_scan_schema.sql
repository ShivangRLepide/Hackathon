-- Scan metadata and masked, aggregated findings only. Owner-scoped RLS.

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_type text not null check (file_type in ('csv', 'txt')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 1048576),
  overall_risk text not null check (overall_risk in ('None', 'Low', 'Medium', 'High', 'Critical')),
  total_findings integer not null default 0 check (total_findings >= 0),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  owner_id uuid not null,
  detector_type text not null check (detector_type in ('payment_card', 'uk_nino', 'uk_phone', 'email')),
  risk text not null check (risk in ('Low', 'Medium', 'High', 'Critical')),
  occurrence_count integer not null check (occurrence_count >= 1),
  masked_example text not null check (char_length(masked_example) between 1 and 320),
  created_at timestamptz not null default now(),
  -- Composite key: a finding can only attach to a scan with the same owner.
  foreign key (scan_id, owner_id) references public.scans (id, owner_id) on delete cascade
);

create index scans_owner_created_idx on public.scans (owner_id, created_at desc);
create index findings_scan_idx on public.findings (scan_id);

alter table public.scans enable row level security;
alter table public.findings enable row level security;

revoke all on public.scans from anon;
revoke all on public.findings from anon;

create policy scans_select_own on public.scans
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy scans_insert_own on public.scans
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy scans_delete_own on public.scans
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy findings_select_own on public.findings
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy findings_insert_own on public.findings
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- No update policies: scan and finding rows are write-once.

-- =============================================
-- PHASE 5 PATCH — run this in Supabase SQL editor
-- Only needed if you haven't run it yet
-- =============================================

-- Reading schedules table
create table if not exists reading_schedules (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references profiles(id) on delete cascade,
  schedule_data jsonb not null,
  weeks_ahead  int default 1,
  generated_at timestamptz default now(),
  unique(student_id)
);

alter table reading_schedules enable row level security;

drop policy if exists "Students manage own schedule" on reading_schedules;
create policy "Students manage own schedule"
  on reading_schedules for all using (auth.uid() = student_id);

-- Add session_count column if missing
alter table profiles add column if not exists session_count int default 0;

-- Add onboarding_complete column if missing  
alter table profiles add column if not exists onboarding_complete boolean default false;

-- Add group_id column if missing
alter table profiles add column if not exists group_id uuid;

-- Supabase Storage bucket for resources:
-- Go to Supabase dashboard -> Storage -> New bucket
-- Name: resources
-- Public: true
-- Then under Storage -> Policies, add:
--   "Authenticated users can upload" INSERT policy for authenticated role

-- nova_materials table (Phase 10 — PDF/DOCX uploads)
create table if not exists nova_materials (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references profiles(id) on delete cascade,
  file_name    text not null,
  content      text not null,
  created_at   timestamptz default now()
);
alter table nova_materials enable row level security;
drop policy if exists "Students manage own materials" on nova_materials;
create policy "Students manage own materials"
  on nova_materials for all using (auth.uid() = student_id);

-- Migration: 003_nova_materials.sql
-- Adds the nova_materials table so students can upload PDFs/docs
-- that Professor Nova reads when teaching them.

create table if not exists nova_materials (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  file_name   text not null,
  content     text not null,              -- extracted text content (up to ~15k chars)
  created_at  timestamptz default now()
);

-- Index for fast lookup by student
create index if not exists nova_materials_student_idx on nova_materials(student_id);

-- RLS: students can only see and manage their own materials
alter table nova_materials enable row level security;

create policy "Students manage own materials"
  on nova_materials
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

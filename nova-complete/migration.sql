-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- These add the columns needed for PDF-per-course, persona, and knowledge tracing

-- 1. Add course linking columns to nova_materials
ALTER TABLE nova_materials
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES student_courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_code text,
  ADD COLUMN IF NOT EXISTS course_title text,
  ADD COLUMN IF NOT EXISTS chars integer;

-- 2. Add Nova persona preference to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nova_persona text DEFAULT 'professor'
  CHECK (nova_persona IN ('professor', 'coach', 'friendly', 'examprep'));

-- 3. Index for faster course-specific material lookups
CREATE INDEX IF NOT EXISTS idx_nova_materials_course_id
  ON nova_materials(course_id);

CREATE INDEX IF NOT EXISTS idx_nova_materials_student_course
  ON nova_materials(student_id, course_id);

-- Done. You can verify with:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'nova_materials';

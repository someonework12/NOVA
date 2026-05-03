-- ─────────────────────────────────────────────────────────────────
-- migration: 004_upload_patch.sql
-- Run this in your Supabase SQL editor BEFORE deploying the patch
-- ─────────────────────────────────────────────────────────────────

-- 1. Add chunk tracking columns (safe — does nothing if they already exist)
ALTER TABLE nova_materials
  ADD COLUMN IF NOT EXISTS chunk_index  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chunk_total  INTEGER NOT NULL DEFAULT 1;

-- 2. The 'content' column is TEXT in Postgres which has no practical size limit.
--    No change needed — but confirm it is TEXT, not VARCHAR(n):
--    SELECT column_name, data_type, character_maximum_length
--    FROM information_schema.columns
--    WHERE table_name = 'nova_materials' AND column_name = 'content';
--    If it shows data_type = 'character varying', run:
-- ALTER TABLE nova_materials ALTER COLUMN content TYPE TEXT;

-- 3. Index for fast retrieval of all chunks belonging to one file
CREATE INDEX IF NOT EXISTS idx_nova_materials_student_file
  ON nova_materials (student_id, file_name, chunk_index);

-- Done ✓

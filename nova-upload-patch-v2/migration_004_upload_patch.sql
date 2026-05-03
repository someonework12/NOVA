-- Run in Supabase SQL editor BEFORE deploying
ALTER TABLE nova_materials
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chunk_total INTEGER NOT NULL DEFAULT 1;

-- Ensure content column is TEXT (no length cap)
-- ALTER TABLE nova_materials ALTER COLUMN content TYPE TEXT;

CREATE INDEX IF NOT EXISTS idx_nova_materials_chunks
  ON nova_materials (student_id, file_name, chunk_index);

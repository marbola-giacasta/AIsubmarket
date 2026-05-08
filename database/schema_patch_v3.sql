-- ============================================================
-- PATCH v3 — Run in Supabase SQL Editor
-- Adds is_admin column to users table for the admin panel
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- After running this query:
-- 1. Go to Supabase → Table Editor → users
-- 2. Find your own row
-- 3. Click the is_admin cell and set it to TRUE
-- 4. Save — you can now access /admin in the app

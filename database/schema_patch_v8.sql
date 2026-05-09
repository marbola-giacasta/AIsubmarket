-- ============================================================
-- PATCH v8 — Run in Supabase SQL Editor
-- Adds admin_archived column so admins can dismiss resolved
-- requests from the main view into a history tab.
-- ============================================================

ALTER TABLE subdomain_requests
  ADD COLUMN IF NOT EXISTS admin_archived BOOLEAN DEFAULT FALSE;

-- PATCH v8 — Run in Supabase SQL Editor
-- Fixes: column subdomain_requests.admin_archived does not exist

ALTER TABLE subdomain_requests
  ADD COLUMN IF NOT EXISTS admin_archived BOOLEAN DEFAULT FALSE;

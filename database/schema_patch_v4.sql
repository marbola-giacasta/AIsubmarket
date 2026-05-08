-- ============================================================
-- PATCH v4 — Run in Supabase SQL Editor
-- Adds admin_note column to subdomain_requests so the admin
-- can attach a message when approving or rejecting a request.
-- The user sees this note next to their request status.
-- ============================================================

ALTER TABLE subdomain_requests
  ADD COLUMN IF NOT EXISTS admin_note TEXT DEFAULT NULL;

-- ============================================================
-- PATCH v7 — Run in Supabase SQL Editor
-- Adds messages JSONB column to subdomain_requests.
-- Each element: { "id": "uuid", "sender": "admin|user", "text": "...", "sent_at": "ISO" }
-- ============================================================

ALTER TABLE subdomain_requests
  ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;

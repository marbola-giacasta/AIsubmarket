-- ============================================================
-- PATCH v2 — Run this in Supabase SQL Editor
-- Adds the subdomain_requests table for manual approval flow
-- ============================================================

CREATE TABLE IF NOT EXISTS subdomain_requests (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  subdomain        TEXT NOT NULL,
  domain           TEXT NOT NULL,
  fqdn             TEXT NOT NULL,
  requester_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_email  TEXT NOT NULL,
  name             TEXT NOT NULL,
  use_case         TEXT NOT NULL,
  message          TEXT,
  status           TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_requester ON subdomain_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_status    ON subdomain_requests(status);

-- ============================================================
-- PATCH v6 — Run in Supabase SQL Editor
-- Creates root_domains table so the admin can add/manage
-- available domains without touching environment variables.
-- ============================================================

CREATE TABLE IF NOT EXISTS root_domains (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  domain      TEXT UNIQUE NOT NULL,        -- e.g. "open-ai.ch"
  zone_id     TEXT NOT NULL,               -- Cloudflare Zone ID
  description TEXT DEFAULT NULL,           -- optional label for admin UI
  active      BOOLEAN DEFAULT TRUE,        -- false = hidden from purchase page
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with your existing four domains.
-- Replace the zone_id values with your real Cloudflare Zone IDs.
-- If a domain already exists this does nothing (ON CONFLICT DO NOTHING).
INSERT INTO root_domains (domain, zone_id, description, active) VALUES
  ('open-ai.ch',      'YOUR_ZONE_ID_OPENAICH',   'Swiss .ch domain',      TRUE),
  ('open-ai.live',    'YOUR_ZONE_ID_OPENAILIVE',  'Global .live domain',   TRUE),
  ('geminai.info',    'YOUR_ZONE_ID_GEMINAI',     'Info domain',           TRUE),
  ('course-ai.co.uk', 'YOUR_ZONE_ID_COURSEAI',    'UK .co.uk domain',      TRUE)
ON CONFLICT (domain) DO NOTHING;

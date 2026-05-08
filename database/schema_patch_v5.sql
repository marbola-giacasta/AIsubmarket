-- ============================================================
-- PATCH v5 — Run in Supabase SQL Editor
-- ============================================================

-- Admin can send a standalone comment before deciding
ALTER TABLE subdomain_requests
  ADD COLUMN IF NOT EXISTS admin_comment TEXT DEFAULT NULL;

-- Monthly price proposal in three currencies
ALTER TABLE subdomain_requests
  ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_chf DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_eur DECIMAL(10,2) DEFAULT NULL;

-- Tracks where the user is in the price negotiation
-- NULL = no proposal yet | proposed | accepted | declined
ALTER TABLE subdomain_requests
  ADD COLUMN IF NOT EXISTS price_status TEXT DEFAULT NULL;

-- Subscription info on registered subdomains
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_chf DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_eur DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS subscription_cancelled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_cancel_date TIMESTAMPTZ DEFAULT NULL;

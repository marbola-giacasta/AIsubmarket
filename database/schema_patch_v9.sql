-- PATCH v9 — Run in Supabase SQL Editor FIRST before pushing code
-- Ensures all subscription columns exist on tags table

ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS subscription_active    BOOLEAN   DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS subscription_cancelled BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_cancel_date TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_chf DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_eur DECIMAL(10,2) DEFAULT NULL;

UPDATE tags SET subscription_cancelled = FALSE WHERE subscription_cancelled IS NULL;
UPDATE tags SET subscription_active    = TRUE  WHERE subscription_active    IS NULL;

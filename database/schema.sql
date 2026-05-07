-- ============================================================
-- Subdomain Selling Platform — Database Schema
-- PostgreSQL (Supabase)
-- ============================================================

-- Enable UUID extension (already on by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tags / subdomains table
CREATE TABLE IF NOT EXISTS tags (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  subdomain      TEXT NOT NULL,
  domain         TEXT NOT NULL,
  fqdn           TEXT UNIQUE NOT NULL,
  owner_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  dns_record_id  TEXT,
  dns_type       TEXT CHECK(dns_type IN ('A','CNAME','MX','TXT','AAAA')),
  dns_value      TEXT,
  dns_proxied    INTEGER DEFAULT 0,
  dns_ttl        INTEGER DEFAULT 3600,
  dns_updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tags_owner  ON tags(owner_id);
CREATE INDEX IF NOT EXISTS idx_tags_domain ON tags(domain);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Subdomain purchase requests (manual approval flow)
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

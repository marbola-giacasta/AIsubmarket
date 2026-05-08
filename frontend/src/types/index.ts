// ─────────────────────────────────────────────────────────────
// I'm putting all my shared TypeScript types in one place so I
// don't have to re-define them in every component file.
// If I need to change a type, I only do it here.
// ─────────────────────────────────────────────────────────────

// The shape of a logged-in user — comes back from /api/auth/me
export interface User {
  id:         string;
  email:      string;
  is_admin:   boolean;
  created_at: string;
}

// DNS record types Cloudflare supports
export type DnsType = 'A' | 'CNAME' | 'MX' | 'TXT' | 'AAAA';

// A subdomain tag row from the database
export interface Tag {
  id:            string;
  subdomain:     string;
  domain:        string;
  fqdn:          string;     // full qualified domain name, e.g. "mario.open-ai.ch"
  owner_id:      string;
  created_at:    string;
  dns_record_id: string | null;
  dns_type:      DnsType | null;
  dns_value:     string | null;
  dns_proxied:   number;     // 0 = off, 1 = on (stored as int in SQLite-compatible DB)
  dns_ttl:       number;
  dns_updated_at:string | null;
}

// A manual purchase request from the subdomain_requests table
export interface SubdomainRequest {
  id:              string;
  subdomain:       string;
  domain:          string;
  fqdn:            string;
  requester_id:    string;
  requester_email: string;
  name:            string;
  use_case:        string;
  message:         string | null;
  status:          'pending' | 'approved' | 'rejected';
  created_at:      string;
}

// What I send to the API when setting/updating a DNS record
export interface DnsPayload {
  dns_type:    DnsType;
  dns_value:   string;
  dns_proxied: boolean;
  dns_ttl:     number;
}

// The domain metadata I use for display labels on the UI
export interface DomainMeta {
  zone: string; // e.g. "CH", "UK", "GLOBAL"
}
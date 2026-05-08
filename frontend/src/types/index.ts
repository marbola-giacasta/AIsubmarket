// ─────────────────────────────────────────────────────────────
// types/index.ts — shared TypeScript types for the frontend.
// ─────────────────────────────────────────────────────────────

export interface User {
  id:         string;
  email:      string;
  is_admin:   boolean;
  created_at: string;
}

export type DnsType = 'A' | 'CNAME' | 'MX' | 'TXT' | 'AAAA';

export interface Tag {
  id:                      string;
  subdomain:               string;
  domain:                  string;
  fqdn:                    string;
  owner_id:                string;
  created_at:              string;
  dns_record_id:           string | null;
  dns_type:                DnsType | null;
  dns_value:               string | null;
  dns_proxied:             number;
  dns_ttl:                 number;
  dns_updated_at:          string | null;
  // Subscription fields added in patch v5
  price_usd:               number | null;
  price_chf:               number | null;
  price_eur:               number | null;
  subscription_active:     boolean;
  subscription_cancelled:  boolean;
  subscription_cancel_date:string | null;
}

export type PriceStatus = 'proposed' | 'accepted' | 'declined' | null;

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
  admin_note:      string | null;
  // New in patch v5
  admin_comment:   string | null;  // standalone comment before decision
  price_usd:       number | null;
  price_chf:       number | null;
  price_eur:       number | null;
  price_status:    PriceStatus;
  created_at:      string;
}

export interface DnsPayload {
  dns_type:    DnsType;
  dns_value:   string;
  dns_proxied: boolean;
  dns_ttl:     number;
}

export interface DomainMeta {
  zone: string;
}

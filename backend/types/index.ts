// ─────────────────────────────────────────────────────────────
// backend/types/index.ts — all my shared backend types.
// I define these once and import them in routes, middleware,
// and helper files so everything stays consistent.
// ─────────────────────────────────────────────────────────────

// The shape of a user row in the database
export interface DbUser {
  id:            string;
  email:         string;
  password_hash: string;
  is_admin:      boolean;
  created_at:    string;
}

// What I return to the frontend — I never send password_hash
export type SafeUser = Omit<DbUser, 'password_hash'>;

// The DNS record types Cloudflare supports
export type DnsType = 'A' | 'CNAME' | 'MX' | 'TXT' | 'AAAA';

// A subdomain (tag) row in the database
export interface DbTag {
  id:             string;
  subdomain:      string;
  domain:         string;
  fqdn:           string;
  owner_id:       string;
  created_at:     string;
  dns_record_id:  string | null;
  dns_type:       DnsType | null;
  dns_value:      string | null;
  dns_proxied:    number;    // 0 or 1
  dns_ttl:        number;
  dns_updated_at: string | null;
}

// A row from the subdomain_requests table
export interface DbSubdomainRequest {
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

// What the JWT payload looks like after I sign it on login
export interface JwtPayload {
  id:    string;
  email: string;
}

// I extend Express's Request type so req.user is always typed
// after my auth middleware runs
declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

// Args I pass to the Cloudflare DNS helper functions
export interface CreateDnsArgs {
  domain:    string;
  subdomain: string;
  type:      DnsType;
  value:     string;
  proxied:   boolean;
  ttl:       number;
}

export interface UpdateDnsArgs {
  domain:   string;
  recordId: string;
  type:     DnsType;
  value:    string;
  proxied:  boolean;
  ttl:      number;
}

export interface DeleteDnsArgs {
  domain:   string;
  recordId: string;
}

// Args for the email notification helper
export interface EmailArgs {
  name:     string;
  email:    string;
  subdomain:string;
  domain:   string;
  fqdn:     string;
  useCase:  string;
  message?: string | null;
}
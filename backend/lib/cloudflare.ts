// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// lib/cloudflare.ts
// Updated: zone IDs are now read from the root_domains table
// in Supabase at runtime, so the admin can add domains without
// redeploying. Env var zone IDs still work as a fallback for
// the four original domains in case the DB isn't migrated yet.
// ─────────────────────────────────────────────────────────────

const CF_API = 'https://api.cloudflare.com/client/v4';

// Env var fallbacks for the original four domains
const ZONE_MAP_ENV = {
  'open-ai.ch':      process.env.CLOUDFLARE_ZONE_ID_OPENAICH,
  'open-ai.live':    process.env.CLOUDFLARE_ZONE_ID_OPENAILIVE,
  'geminai.info':    process.env.CLOUDFLARE_ZONE_ID_GEMINAI,
  'course-ai.co.uk': process.env.CLOUDFLARE_ZONE_ID_COURSEAI,
};

// Export for routes that need the list of available domains
export const ZONE_MAP = ZONE_MAP_ENV;

function cfHeaders() {
  return {
    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type':  'application/json',
  };
}

async function cfRequest(method, path, body = null) {
  const res  = await fetch(`${CF_API}${path}`, { method, headers: cfHeaders(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || 'Cloudflare API error');
  return data.result;
}

// Looks up zone ID: DB first, env var fallback, error if neither
async function getZoneId(domain) {
  // Try DB first (supports dynamically added domains)
  try {
    const supabase = require('./database').default;
    const { data } = await supabase.from('root_domains').select('zone_id').eq('domain', domain).single();
    if (data?.zone_id) return data.zone_id;
  } catch (_) { /* fall through to env var */ }

  // Env var fallback for original four domains
  const fromEnv = ZONE_MAP_ENV[domain];
  if (fromEnv) return fromEnv;

  throw new Error(`No Cloudflare zone configured for domain: ${domain}`);
}

export async function createDnsRecord({ domain, subdomain, type, value, proxied = false, ttl = 3600 }) {
  const zoneId = await getZoneId(domain);
  const record = await cfRequest('POST', `/zones/${zoneId}/dns_records`, {
    type, name: subdomain, content: value, proxied, ttl: proxied ? 1 : ttl,
  });
  return record.id;
}

export async function updateDnsRecord({ domain, subdomain, recordId, type, value, proxied = false, ttl = 3600 }) {
  const zoneId = await getZoneId(domain);
  // Cloudflare PUT requires 'name' — without it the API returns
  // "could not route to /zones/YOUR_ZONE_ID/dns_records — invalid identifier"
  await cfRequest('PUT', `/zones/${zoneId}/dns_records/${recordId}`, {
    type,
    name: subdomain,   // e.g. "mario" (just the subdomain part, not FQDN)
    content: value,
    proxied,
    ttl: proxied ? 1 : ttl,
  });
}

export async function deleteDnsRecord({ domain, recordId }) {
  const zoneId = await getZoneId(domain);
  await cfRequest('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
}

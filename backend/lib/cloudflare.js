// ============================================================
// Cloudflare DNS API wrapper
// Docs: https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-create-dns-record
// ============================================================

const CF_API = 'https://api.cloudflare.com/client/v4';

// Map domain → Cloudflare Zone ID (set all in .env)
const ZONE_MAP = {
  'open-ai.ch':      process.env.CLOUDFLARE_ZONE_ID_OPENAICH,
  'open-ai.live':    process.env.CLOUDFLARE_ZONE_ID_OPENAILIVE,
  'geminai.info':    process.env.CLOUDFLARE_ZONE_ID_GEMINAI,
  'course-ai.co.uk': process.env.CLOUDFLARE_ZONE_ID_COURSEAI,
};

function getZoneId(domain) {
  const zoneId = ZONE_MAP[domain];
  if (!zoneId) throw new Error(`No Cloudflare zone configured for domain: ${domain}`);
  return zoneId;
}

function cfHeaders() {
  return {
    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type':  'application/json',
  };
}

async function cfRequest(method, path, body = null) {
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: cfHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) {
    const msg = data.errors?.[0]?.message || 'Cloudflare API error';
    throw new Error(msg);
  }
  return data.result;
}

/**
 * Create a new DNS record.
 * @returns {string} The Cloudflare record ID
 */
async function createDnsRecord({ domain, subdomain, type, value, proxied = false, ttl = 3600 }) {
  const zoneId = getZoneId(domain);
  const record = await cfRequest('POST', `/zones/${zoneId}/dns_records`, {
    type,
    name:    subdomain,          // Cloudflare accepts short name, prepends zone
    content: value,
    proxied,
    ttl:     proxied ? 1 : ttl,  // CF auto-TTL when proxied
  });
  return record.id;
}

/**
 * Update an existing DNS record.
 */
async function updateDnsRecord({ domain, recordId, type, value, proxied = false, ttl = 3600 }) {
  const zoneId = getZoneId(domain);
  await cfRequest('PUT', `/zones/${zoneId}/dns_records/${recordId}`, {
    type,
    content: value,
    proxied,
    ttl:     proxied ? 1 : ttl,
  });
}

/**
 * Delete a DNS record.
 */
async function deleteDnsRecord({ domain, recordId }) {
  const zoneId = getZoneId(domain);
  await cfRequest('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
}

module.exports = { createDnsRecord, updateDnsRecord, deleteDnsRecord, ZONE_MAP };

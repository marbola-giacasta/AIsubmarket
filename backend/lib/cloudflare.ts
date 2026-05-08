// ─────────────────────────────────────────────────────────────
// lib/cloudflare.ts — wrapper around the Cloudflare DNS API.
// I call these functions from the subdomains routes when a user
// saves, updates, or deletes a DNS record.
// Cloudflare docs: https://developers.cloudflare.com/api/
// ─────────────────────────────────────────────────────────────

import type { CreateDnsArgs, UpdateDnsArgs, DeleteDnsArgs } from '../types';

const CF_API = 'https://api.cloudflare.com/client/v4';

// Maps each of my domain names to its Cloudflare Zone ID.
// Zone IDs come from the Cloudflare dashboard sidebar for each domain.
// I store them as environment variables so they're not hardcoded in source.
export const ZONE_MAP: Record<string, string | undefined> = {
  'open-ai.ch':      process.env.CLOUDFLARE_ZONE_ID_OPENAICH,
  'open-ai.live':    process.env.CLOUDFLARE_ZONE_ID_OPENAILIVE,
  'geminai.info':    process.env.CLOUDFLARE_ZONE_ID_GEMINAI,
  'course-ai.co.uk': process.env.CLOUDFLARE_ZONE_ID_COURSEAI,
};

// Returns the zone ID for a given domain, or throws if it's not configured.
// I want a loud error here rather than a silent undefined.
function getZoneId(domain: string): string {
  const zoneId = ZONE_MAP[domain];
  if (!zoneId) throw new Error(`No Cloudflare zone configured for domain: ${domain}`);
  return zoneId;
}

// Builds the standard Cloudflare auth headers — same for every request
function cfHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type':  'application/json',
  };
}

// Generic Cloudflare API request — I reuse this for all three operations below
async function cfRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res  = await fetch(`${CF_API}${path}`, {
    method,
    headers: cfHeaders(),
    body:    body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as { success: boolean; result: T; errors: Array<{ message: string }> };

  // Cloudflare always returns { success: true/false } — I check it explicitly
  if (!data.success) {
    const msg = data.errors?.[0]?.message ?? 'Cloudflare API error';
    throw new Error(msg);
  }
  return data.result;
}

// Creates a new DNS record and returns the Cloudflare record ID.
// I store this ID in the database so I can update or delete it later.
export async function createDnsRecord(args: CreateDnsArgs): Promise<string> {
  const zoneId = getZoneId(args.domain);
  const record = await cfRequest<{ id: string }>(
    'POST',
    `/zones/${zoneId}/dns_records`,
    {
      type:    args.type,
      name:    args.subdomain,   // Cloudflare prepends the zone domain automatically
      content: args.value,
      proxied: args.proxied,
      ttl:     args.proxied ? 1 : args.ttl, // TTL must be 1 (auto) when proxied
    }
  );
  return record.id;
}

// Updates an existing DNS record — I need the Cloudflare record ID for this
export async function updateDnsRecord(args: UpdateDnsArgs): Promise<void> {
  const zoneId = getZoneId(args.domain);
  await cfRequest(
    'PUT',
    `/zones/${zoneId}/dns_records/${args.recordId}`,
    {
      type:    args.type,
      content: args.value,
      proxied: args.proxied,
      ttl:     args.proxied ? 1 : args.ttl,
    }
  );
}

// Deletes a DNS record from Cloudflare — called when a subdomain is released
export async function deleteDnsRecord(args: DeleteDnsArgs): Promise<void> {
  const zoneId = getZoneId(args.domain);
  await cfRequest('DELETE', `/zones/${zoneId}/dns_records/${args.recordId}`);
}
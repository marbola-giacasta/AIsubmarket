// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// Helper: fetch active domains from DB, fallback to env vars.
// Used by both the /domains endpoint and validation in routes.
// ─────────────────────────────────────────────────────────────

const supabase = require('../lib/database').default;
const { ZONE_MAP } = require('../lib/cloudflare');

export async function getActiveDomains(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('root_domains')
      .select('domain')
      .eq('active', true)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) return data.map(d => d.domain);
  } catch (_) { /* fall through */ }
  // Fallback to env-var domains if DB table doesn't exist yet
  return Object.keys(ZONE_MAP).filter(d => ZONE_MAP[d]);
}

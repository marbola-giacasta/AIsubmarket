// ─────────────────────────────────────────────────────────────
// lib/database.ts — creates and exports the Supabase client.
// I import this singleton in every route file that needs the DB.
// I never create multiple clients — that wastes connections.
// ─────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These come from .env locally and from Vercel env vars in production.
// I cast to string because I know they're set — if they weren't,
// the Supabase constructor would throw a clear error immediately.
const supabaseUrl: string = process.env.SUPABASE_URL as string;
const supabaseKey: string = process.env.SUPABASE_SERVICE_KEY as string;

// service role key gives me full DB access, bypassing row-level security.
// I only use this on the backend — never expose this key to the browser.
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export default supabase;
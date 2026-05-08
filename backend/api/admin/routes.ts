// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// api/admin/routes.ts
// Updated in this version:
//   - approve and reject both accept an optional admin_note
//     in the request body, which gets saved to the DB so the
//     user can see the admin's message on their dashboard.
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import supabase from '../../lib/database';
import { requireAuth } from '../../middleware/auth';
import { sendSubdomainRequest } from '../../lib/email';

const router = Router();

// I check is_admin from the DB on every admin request —
// not just from the JWT — so revoking admin is instant
async function requireAdmin(req, res, next) {
  const { data: user } = await supabase
    .from('users').select('is_admin').eq('id', req.user.id).single();
  if (!user?.is_admin) { res.status(403).json({ error: 'Admin access required' }); return; }
  next();
}

// ── GET /api/admin/requests ───────────────────────────────────
router.get('/requests', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('subdomain_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data });
  } catch (err) { next(err); }
});

// ── GET /api/admin/subdomains ─────────────────────────────────
router.get('/subdomains', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tags').select('*, users(email)').order('created_at', { ascending: false });
    if (error) throw error;
    const subdomains = (data ?? []).map(t => ({
      ...t, owner_email: t.users?.email ?? null, users: undefined,
    }));
    res.json({ subdomains });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users ──────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('users').select('id, email, is_admin, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    const usersWithCounts = await Promise.all(
      (users ?? []).map(async u => {
        const { count } = await supabase
          .from('tags').select('*', { count: 'exact', head: true }).eq('owner_id', u.id);
        return { ...u, domain_count: count ?? 0 };
      })
    );
    res.json({ users: usersWithCounts });
  } catch (err) { next(err); }
});

// ── POST /api/admin/requests/:id/approve ─────────────────────
// Body: { admin_note?: string } — optional message to the user
router.post('/requests/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    // admin_note is optional — if not provided it stays null
    const admin_note = req.body?.admin_note?.trim() || null;

    const { data: request, error: fetchErr } = await supabase
      .from('subdomain_requests').select('*').eq('id', id).single();
    if (fetchErr || !request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Already resolved' });

    const { data: existing } = await supabase.from('tags').select('id').eq('fqdn', request.fqdn).single();
    if (existing) return res.status(409).json({ error: `${request.fqdn} is already registered` });

    // Register the subdomain
    await supabase.from('tags').insert({
      subdomain: request.subdomain, domain: request.domain,
      fqdn: request.fqdn, owner_id: request.requester_id,
    });

    // Save status + admin note so the user can see the decision
    await supabase.from('subdomain_requests')
      .update({ status: 'approved', admin_note }).eq('id', id);

    try {
      await sendSubdomainRequest({
        name: request.name, email: request.requester_email,
        subdomain: request.subdomain, domain: request.domain, fqdn: request.fqdn,
        useCase: 'APPROVED',
        message: admin_note || `Your subdomain ${request.fqdn} is now active. Log in to configure DNS.`,
      });
    } catch (e) { console.warn('Approval email failed:', e.message); }

    res.json({ message: `${request.fqdn} approved and registered` });
  } catch (err) { next(err); }
});

// ── POST /api/admin/requests/:id/reject ──────────────────────
// Body: { admin_note?: string } — optional rejection reason
router.post('/requests/:id/reject', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_note = req.body?.admin_note?.trim() || null;

    const { data } = await supabase.from('subdomain_requests').select('id').eq('id', id).single();
    if (!data) return res.status(404).json({ error: 'Request not found' });

    // Save status + admin note
    await supabase.from('subdomain_requests')
      .update({ status: 'rejected', admin_note }).eq('id', id);

    res.json({ message: 'Request rejected' });
  } catch (err) { next(err); }
});

export default router;

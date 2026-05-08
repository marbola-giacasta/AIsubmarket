// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// api/admin/routes.ts — admin-only endpoints.
// Double-protected: requireAuth checks JWT, requireAdmin
// checks is_admin = true in the database.
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import supabase from '../../lib/database';
import { requireAuth } from '../../middleware/auth';
import { sendSubdomainRequest } from '../../lib/email';

const router = Router();

async function requireAdmin(req, res, next) {
  const { data: user } = await supabase
    .from('users').select('is_admin').eq('id', req.user.id).single();
  if (!user?.is_admin) { res.status(403).json({ error: 'Admin access required' }); return; }
  next();
}

router.get('/requests', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('subdomain_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data });
  } catch (err) { next(err); }
});

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

// Returns all users with domain_count attached
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

router.post('/requests/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request, error: fetchErr } = await supabase
      .from('subdomain_requests').select('*').eq('id', id).single();
    if (fetchErr || !request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Already resolved' });
    const { data: existing } = await supabase.from('tags').select('id').eq('fqdn', request.fqdn).single();
    if (existing) return res.status(409).json({ error: `${request.fqdn} is already registered` });
    await supabase.from('tags').insert({
      subdomain: request.subdomain, domain: request.domain,
      fqdn: request.fqdn, owner_id: request.requester_id,
    });
    await supabase.from('subdomain_requests').update({ status: 'approved' }).eq('id', id);
    try {
      await sendSubdomainRequest({
        name: request.name, email: request.requester_email,
        subdomain: request.subdomain, domain: request.domain, fqdn: request.fqdn,
        useCase: 'APPROVED',
        message: `Your subdomain ${request.fqdn} is now active. Log in to configure DNS.`,
      });
    } catch (e) { console.warn('Approval email failed:', e.message); }
    res.json({ message: `${request.fqdn} approved and registered` });
  } catch (err) { next(err); }
});

router.post('/requests/:id/reject', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = await supabase.from('subdomain_requests').select('id').eq('id', id).single();
    if (!data) return res.status(404).json({ error: 'Request not found' });
    await supabase.from('subdomain_requests').update({ status: 'rejected' }).eq('id', id);
    res.json({ message: 'Request rejected' });
  } catch (err) { next(err); }
});

export default router;

// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// api/admin/routes.ts
// Added in this version:
//   GET  /api/admin/root-domains         list all root domains
//   POST /api/admin/root-domains         add a new domain
//   PUT  /api/admin/root-domains/:id     update zone_id / description / active
//   DELETE /api/admin/root-domains/:id   remove a domain
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import supabase from '../../lib/database';
import { requireAuth } from '../../middleware/auth';
import { sendSubdomainRequest } from '../../lib/email';

const router = Router();

async function requireAdmin(req, res, next) {
  const { data: user } = await supabase.from('users').select('is_admin').eq('id', req.user.id).single();
  if (!user?.is_admin) { res.status(403).json({ error: 'Admin access required' }); return; }
  next();
}

// ── Requests ──────────────────────────────────────────────────
router.get('/requests', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('subdomain_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data });
  } catch (err) { next(err); }
});

router.get('/subdomains', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('tags').select('*, users(email)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ subdomains: (data ?? []).map(t => ({ ...t, owner_email: t.users?.email ?? null, users: undefined })) });
  } catch (err) { next(err); }
});

router.get('/users', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data: users, error } = await supabase.from('users').select('id, email, is_admin, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    const usersWithCounts = await Promise.all(
      (users ?? []).map(async u => {
        const { count } = await supabase.from('tags').select('*', { count: 'exact', head: true }).eq('owner_id', u.id);
        return { ...u, domain_count: count ?? 0 };
      })
    );
    res.json({ users: usersWithCounts });
  } catch (err) { next(err); }
});

router.post('/requests/:id/comment', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_comment = req.body?.admin_comment?.trim();
    if (!admin_comment) return res.status(400).json({ error: 'admin_comment is required' });
    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    await supabase.from('subdomain_requests').update({ admin_comment }).eq('id', id);
    res.json({ message: 'Comment saved' });
  } catch (err) { next(err); }
});

router.post('/requests/:id/propose-price', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price_usd, price_chf, price_eur, admin_comment } = req.body;
    if (!price_usd && !price_chf && !price_eur) return res.status(400).json({ error: 'At least one price required' });
    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Can only propose price on pending requests' });
    await supabase.from('subdomain_requests').update({
      price_usd: price_usd ? Number(price_usd) : null,
      price_chf: price_chf ? Number(price_chf) : null,
      price_eur: price_eur ? Number(price_eur) : null,
      price_status: 'proposed',
      admin_comment: admin_comment?.trim() || request.admin_comment || null,
    }).eq('id', id);
    res.json({ message: 'Price proposal sent' });
  } catch (err) { next(err); }
});

router.post('/requests/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_note = req.body?.admin_note?.trim() || null;
    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Already resolved' });
    const { data: existing } = await supabase.from('tags').select('id').eq('fqdn', request.fqdn).single();
    if (existing) return res.status(409).json({ error: `${request.fqdn} is already registered` });
    const priceAccepted = request.price_status === 'accepted';
    await supabase.from('tags').insert({
      subdomain: request.subdomain, domain: request.domain, fqdn: request.fqdn,
      owner_id: request.requester_id,
      price_usd: priceAccepted ? request.price_usd : null,
      price_chf: priceAccepted ? request.price_chf : null,
      price_eur: priceAccepted ? request.price_eur : null,
      subscription_active: true,
    });
    await supabase.from('subdomain_requests').update({ status: 'approved', admin_note }).eq('id', id);
    try {
      await sendSubdomainRequest({ name: request.name, email: request.requester_email, subdomain: request.subdomain, domain: request.domain, fqdn: request.fqdn, useCase: 'APPROVED', message: admin_note || `Your subdomain ${request.fqdn} is now active.` });
    } catch (e) { console.warn('Email failed:', e.message); }
    res.json({ message: `${request.fqdn} approved` });
  } catch (err) { next(err); }
});

router.post('/requests/:id/reject', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_note = req.body?.admin_note?.trim() || null;
    await supabase.from('subdomain_requests').update({ status: 'rejected', admin_note }).eq('id', id);
    res.json({ message: 'Request rejected' });
  } catch (err) { next(err); }
});

router.post('/subdomains/:id/cancel-subscription', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await supabase.from('tags').update({ subscription_cancelled: true, subscription_cancel_date: new Date().toISOString() }).eq('id', id);
    res.json({ message: 'Subscription cancelled' });
  } catch (err) { next(err); }
});

// ── Root domain management ────────────────────────────────────

// GET all root domains (active and inactive)
router.get('/root-domains', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('root_domains').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ domains: data });
  } catch (err) { next(err); }
});

// POST add a new root domain
// Body: { domain, zone_id, description?, active? }
router.post('/root-domains', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { domain, zone_id, description, active = true } = req.body;
    if (!domain || !zone_id) return res.status(400).json({ error: 'domain and zone_id are required' });

    // Validate domain format — no spaces, must look like a domain
    if (!/^[a-z0-9][a-z0-9-]*(\.[a-z]{2,})+$/.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    const { data, error } = await supabase.from('root_domains')
      .insert({ domain, zone_id, description: description || null, active })
      .select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: `${domain} already exists` });
      throw error;
    }
    res.status(201).json({ domain: data });
  } catch (err) { next(err); }
});

// PUT update a root domain (zone_id, description, active toggle)
router.put('/root-domains/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { zone_id, description, active } = req.body;
    const updates = {};
    if (zone_id     !== undefined) updates.zone_id     = zone_id;
    if (description !== undefined) updates.description = description;
    if (active      !== undefined) updates.active      = active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    const { data, error } = await supabase.from('root_domains').update(updates).eq('id', id).select('*').single();
    if (error) throw error;
    res.json({ domain: data });
  } catch (err) { next(err); }
});

// DELETE remove a root domain — only if no subdomains are registered on it
router.delete('/root-domains/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: dom } = await supabase.from('root_domains').select('domain').eq('id', id).single();
    if (!dom) return res.status(404).json({ error: 'Domain not found' });

    // Refuse deletion if there are registered subdomains on this domain
    const { count } = await supabase.from('tags').select('*', { count: 'exact', head: true }).eq('domain', dom.domain);
    if (count && count > 0) return res.status(409).json({ error: `Cannot delete: ${count} subdomain(s) registered on ${dom.domain}` });

    await supabase.from('root_domains').delete().eq('id', id);
    res.json({ message: `${dom.domain} removed` });
  } catch (err) { next(err); }
});


// ── GET messages for a request (admin polling) ────────────────
router.get('/requests/:id/messages', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: request } = await supabase
      .from('subdomain_requests').select('messages').eq('id', req.params.id).single();
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json({ messages: request.messages || [] });
  } catch (err) { next(err); }
});

// ── POST admin sends a message ────────────────────────────────
router.post('/requests/:id/message', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
    const { data: request } = await supabase
      .from('subdomain_requests').select('messages').eq('id', req.params.id).single();
    if (!request) return res.status(404).json({ error: 'Not found' });
    const msgs = [
      ...(Array.isArray(request.messages) ? request.messages : []),
      { id: Date.now().toString(), sender: 'admin', text: text.trim(), sent_at: new Date().toISOString() },
    ];
    await supabase.from('subdomain_requests').update({ messages: msgs }).eq('id', req.params.id);
    res.json({ messages: msgs });
  } catch (err) { next(err); }
});

export default router;

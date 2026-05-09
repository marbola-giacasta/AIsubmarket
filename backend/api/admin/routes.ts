// @ts-nocheck
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

// ── GET /requests — main view (non-archived) ──────────────────
// For approved requests, also checks whether the tag still exists
// so the frontend can show "renewal cancelled" if the user deleted it.
router.get('/requests', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    let { data: requests, error } = await supabase
      .from('subdomain_requests')
      .select('*')
      .eq('admin_archived', false)
      .order('created_at', { ascending: false });

    if (error && error.message?.includes('admin_archived')) {
      const fb = await supabase.from('subdomain_requests').select('*').order('created_at', { ascending: false });
      requests = fb.data; error = fb.error;
    }
    if (error) throw error;

    // For approved requests, check which tags are still alive
    const approvedFqdns = (requests || []).filter(r => r.status === 'approved').map(r => r.fqdn);
    let activeFqdns = new Set();
    if (approvedFqdns.length > 0) {
      const { data: liveTags } = await supabase
        .from('tags')
        .select('fqdn, dns_type, dns_value, subscription_cancelled')
        .in('fqdn', approvedFqdns);
      (liveTags || []).forEach(t => activeFqdns.set(t.fqdn, t));
    }

    // Attach tag_status to each approved request so the frontend can show badges
    const enriched = (requests || []).map(r => {
      if (r.status !== 'approved') return r;
      const tag = activeFqdns.get(r.fqdn);
      return {
        ...r,
        tag_exists:         !!tag,
        tag_cancelled:      tag ? !!tag.subscription_cancelled : false,
        tag_has_dns:        tag ? !!(tag.dns_type && tag.dns_value) : false,
      };
    });

    res.json({ requests: enriched });
  } catch (err) { next(err); }
});

// ── GET /requests/history ─────────────────────────────────────
router.get('/requests/history', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    let { data, error } = await supabase
      .from('subdomain_requests').select('*')
      .eq('admin_archived', true).order('created_at', { ascending: false });
    if (error && error.message?.includes('admin_archived')) return res.json({ requests: [] });
    if (error) throw error;
    res.json({ requests: data });
  } catch (err) { next(err); }
});

// ── GET /subdomains — two separate queries, no FK join needed ─
router.get('/subdomains', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    // Fetch tags and users separately — avoids needing a FK defined in Supabase
    const [{ data: tags, error: tagsErr }, { data: users, error: usersErr }] = await Promise.all([
      supabase.from('tags').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id, email'),
    ]);
    if (tagsErr) throw tagsErr;
    if (usersErr) throw usersErr;

    // Build a lookup map so we can attach owner_email without N+1 queries
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u.email]));
    const subdomains = (tags || []).map(t => ({
      ...t,
      owner_email: userMap[t.owner_id] || null,
    }));
    res.json({ subdomains });
  } catch (err) { next(err); }
});

// ── GET /users ────────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('users').select('id, email, is_admin, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    const usersWithCounts = await Promise.all(
      (users ?? []).map(async u => {
        const { count } = await supabase.from('tags').select('*', { count:'exact', head:true }).eq('owner_id', u.id);
        return { ...u, domain_count: count ?? 0 };
      })
    );
    res.json({ users: usersWithCounts });
  } catch (err) { next(err); }
});

// ── POST archive ──────────────────────────────────────────────
router.post('/requests/:id/archive', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('subdomain_requests').update({ admin_archived: true }).eq('id', req.params.id);
    res.json({ message: 'Archived' });
  } catch (err) { next(err); }
});

// ── DELETE single history record ──────────────────────────────
router.delete('/requests/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('subdomain_requests').delete().eq('id', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ── DELETE all history ────────────────────────────────────────
router.delete('/requests/history/all', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    await supabase.from('subdomain_requests').delete().eq('admin_archived', true);
    res.json({ message: 'History cleared' });
  } catch (err) { next(err); }
});

// ── POST comment ──────────────────────────────────────────────
router.post('/requests/:id/comment', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const admin_comment = req.body?.admin_comment?.trim();
    if (!admin_comment) return res.status(400).json({ error: 'admin_comment is required' });
    await supabase.from('subdomain_requests').update({ admin_comment }).eq('id', req.params.id);
    res.json({ message: 'Comment saved' });
  } catch (err) { next(err); }
});

// ── POST propose-price ────────────────────────────────────────
router.post('/requests/:id/propose-price', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { price_usd, price_chf, price_eur } = req.body;
    if (!price_usd && !price_chf && !price_eur) return res.status(400).json({ error: 'At least one price required' });
    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', req.params.id).single();
    if (!request || request.status !== 'pending') return res.status(400).json({ error: 'Invalid request' });
    await supabase.from('subdomain_requests').update({
      price_usd: price_usd ? Number(price_usd) : null,
      price_chf: price_chf ? Number(price_chf) : null,
      price_eur: price_eur ? Number(price_eur) : null,
      price_status: 'proposed',
    }).eq('id', req.params.id);
    res.json({ message: 'Price proposal sent' });
  } catch (err) { next(err); }
});

// ── POST approve ──────────────────────────────────────────────
router.post('/requests/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const admin_note = req.body?.admin_note?.trim() || null;
    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', req.params.id).single();
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Already resolved' });
    const { data: existing } = await supabase.from('tags').select('id').eq('fqdn', request.fqdn).single();
    if (existing) return res.status(409).json({ error: `${request.fqdn} already registered` });
    const priceAccepted = request.price_status === 'accepted';
    await supabase.from('tags').insert({
      subdomain: request.subdomain, domain: request.domain, fqdn: request.fqdn,
      owner_id: request.requester_id,
      price_usd: priceAccepted ? request.price_usd : null,
      price_chf: priceAccepted ? request.price_chf : null,
      price_eur: priceAccepted ? request.price_eur : null,
      subscription_active: true,
    });
    await supabase.from('subdomain_requests').update({ status: 'approved', admin_note }).eq('id', req.params.id);
    try { await sendSubdomainRequest({ name: request.name, email: request.requester_email, subdomain: request.subdomain, domain: request.domain, fqdn: request.fqdn, useCase: 'APPROVED', message: admin_note || `${request.fqdn} is now active.` }); }
    catch (e) { console.warn('Email failed:', e.message); }
    res.json({ message: `${request.fqdn} approved` });
  } catch (err) { next(err); }
});

// ── POST reject ───────────────────────────────────────────────
router.post('/requests/:id/reject', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const admin_note = req.body?.admin_note?.trim() || null;
    await supabase.from('subdomain_requests').update({ status: 'rejected', admin_note }).eq('id', req.params.id);
    res.json({ message: 'Request rejected' });
  } catch (err) { next(err); }
});

router.post('/subdomains/:id/cancel-subscription', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('tags').update({ subscription_cancelled: true, subscription_cancel_date: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ message: 'Subscription cancelled' });
  } catch (err) { next(err); }
});

// ── Messages ──────────────────────────────────────────────────
router.get('/requests/:id/messages', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: request } = await supabase.from('subdomain_requests').select('messages').eq('id', req.params.id).single();
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json({ messages: request.messages || [] });
  } catch (err) { next(err); }
});

router.post('/requests/:id/message', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
    const { data: request } = await supabase.from('subdomain_requests').select('messages').eq('id', req.params.id).single();
    if (!request) return res.status(404).json({ error: 'Not found' });
    const msgs = [...(Array.isArray(request.messages) ? request.messages : []),
      { id: Date.now().toString(), sender: 'admin', text: text.trim(), sent_at: new Date().toISOString() }];
    await supabase.from('subdomain_requests').update({ messages: msgs }).eq('id', req.params.id);
    res.json({ messages: msgs });
  } catch (err) { next(err); }
});

// ── Root domains ──────────────────────────────────────────────
router.get('/root-domains', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('root_domains').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ domains: data });
  } catch (err) { next(err); }
});

router.post('/root-domains', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { domain, zone_id, description, active = true } = req.body;
    if (!domain || !zone_id) return res.status(400).json({ error: 'domain and zone_id required' });
    const { data, error } = await supabase.from('root_domains').insert({ domain, zone_id, description: description || null, active }).select('*').single();
    if (error) { if (error.code === '23505') return res.status(409).json({ error: `${domain} already exists` }); throw error; }
    res.status(201).json({ domain: data });
  } catch (err) { next(err); }
});

router.put('/root-domains/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { zone_id, description, active } = req.body;
    const updates = {};
    if (zone_id !== undefined)     updates.zone_id     = zone_id;
    if (description !== undefined) updates.description = description;
    if (active !== undefined)      updates.active      = active;
    const { data, error } = await supabase.from('root_domains').update(updates).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json({ domain: data });
  } catch (err) { next(err); }
});

router.delete('/root-domains/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: dom } = await supabase.from('root_domains').select('domain').eq('id', req.params.id).single();
    if (!dom) return res.status(404).json({ error: 'Not found' });
    const { count } = await supabase.from('tags').select('*', { count:'exact', head:true }).eq('domain', dom.domain);
    if (count && count > 0) return res.status(409).json({ error: `Cannot delete: ${count} subdomain(s) on ${dom.domain}` });
    await supabase.from('root_domains').delete().eq('id', req.params.id);
    res.json({ message: `${dom.domain} removed` });
  } catch (err) { next(err); }
});

export default router;

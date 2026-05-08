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

// ── GET all requests ──────────────────────────────────────────
router.get('/requests', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('subdomain_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data });
  } catch (err) { next(err); }
});

// ── GET all subdomains ────────────────────────────────────────
router.get('/subdomains', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('tags').select('*, users(email)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ subdomains: (data ?? []).map(t => ({ ...t, owner_email: t.users?.email ?? null, users: undefined })) });
  } catch (err) { next(err); }
});

// ── GET all users ─────────────────────────────────────────────
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

// ── POST comment — send a message without deciding ────────────
// Body: { admin_comment: string }
router.post('/requests/:id/comment', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_comment = req.body?.admin_comment?.trim();
    if (!admin_comment) return res.status(400).json({ error: 'admin_comment is required' });

    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Save comment — does NOT change the status
    await supabase.from('subdomain_requests').update({ admin_comment }).eq('id', id);

    res.json({ message: 'Comment saved and will be shown to the user' });
  } catch (err) { next(err); }
});

// ── POST propose-price — send monthly price proposal ──────────
// Body: { price_usd?, price_chf?, price_eur?, admin_comment? }
router.post('/requests/:id/propose-price', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price_usd, price_chf, price_eur, admin_comment } = req.body;

    if (!price_usd && !price_chf && !price_eur) {
      return res.status(400).json({ error: 'At least one price (USD, CHF or EUR) is required' });
    }

    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Can only propose price on pending requests' });

    await supabase.from('subdomain_requests').update({
      price_usd:   price_usd   ? Number(price_usd)   : null,
      price_chf:   price_chf   ? Number(price_chf)   : null,
      price_eur:   price_eur   ? Number(price_eur)   : null,
      price_status: 'proposed',
      admin_comment: admin_comment?.trim() || request.admin_comment || null,
    }).eq('id', id);

    res.json({ message: 'Price proposal sent to user' });
  } catch (err) { next(err); }
});

// ── POST approve ──────────────────────────────────────────────
router.post('/requests/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_note = req.body?.admin_note?.trim() || null;

    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Already resolved' });

    const { data: existing } = await supabase.from('tags').select('id').eq('fqdn', request.fqdn).single();
    if (existing) return res.status(409).json({ error: `${request.fqdn} is already registered` });

    // Register the subdomain, carrying over the agreed price if accepted
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
      await sendSubdomainRequest({
        name: request.name, email: request.requester_email,
        subdomain: request.subdomain, domain: request.domain, fqdn: request.fqdn,
        useCase: 'APPROVED',
        message: admin_note || `Your subdomain ${request.fqdn} is now active.`,
      });
    } catch (e) { console.warn('Approval email failed:', e.message); }

    res.json({ message: `${request.fqdn} approved and registered` });
  } catch (err) { next(err); }
});

// ── POST reject ───────────────────────────────────────────────
router.post('/requests/:id/reject', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin_note = req.body?.admin_note?.trim() || null;
    const { data } = await supabase.from('subdomain_requests').select('id').eq('id', id).single();
    if (!data) return res.status(404).json({ error: 'Request not found' });
    await supabase.from('subdomain_requests').update({ status: 'rejected', admin_note }).eq('id', id);
    res.json({ message: 'Request rejected' });
  } catch (err) { next(err); }
});

// ── POST cancel subscription (admin-side) ─────────────────────
router.post('/subdomains/:id/cancel-subscription', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: tag } = await supabase.from('tags').select('*').eq('id', id).single();
    if (!tag) return res.status(404).json({ error: 'Subdomain not found' });
    await supabase.from('tags').update({
      subscription_cancelled: true,
      subscription_cancel_date: new Date().toISOString(),
    }).eq('id', id);
    res.json({ message: 'Subscription cancelled' });
  } catch (err) { next(err); }
});

export default router;

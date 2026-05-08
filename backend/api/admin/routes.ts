// ─────────────────────────────────────────────────────────────
// api/admin/routes.ts — admin-only endpoints.
// These routes are protected by two layers:
//   1. requireAuth — checks the JWT token is valid
//   2. requireAdmin — checks the user has is_admin = true in DB
// Even if someone guesses the URL, they can't access it
// without a valid admin token.
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import supabase from '../../lib/database';
import { requireAuth } from '../../middleware/auth';
import { sendSubdomainRequest } from '../../lib/email';
import type { DbSubdomainRequest, DbTag } from '../../types';

const router = Router();

// ── Admin guard middleware ────────────────────────────────────
// I define this here because it's only used in this file
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', req.user.id)
    .single<{ is_admin: boolean }>();

  if (!user?.is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

// ── GET /api/admin/requests ───────────────────────────────────
// Returns all subdomain requests — most recent first
router.get('/requests', requireAuth, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('subdomain_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data as DbSubdomainRequest[] });
  } catch (err) { next(err); }
});

// ── GET /api/admin/subdomains ─────────────────────────────────
// Returns all registered subdomains across all users,
// with the owner's email joined in
router.get('/subdomains', requireAuth, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*, users(email)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // I flatten the nested users object into a plain owner_email field
    const subdomains = (data ?? []).map((t: DbTag & { users?: { email: string } }) => ({
      ...t,
      owner_email: t.users?.email ?? null,
      users: undefined,
    }));
    res.json({ subdomains });
  } catch (err) { next(err); }
});

// ── POST /api/admin/requests/:id/approve ─────────────────────
// Registers the subdomain in the tags table and notifies the user
router.post('/requests/:id/approve', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Fetch the request so I know what subdomain to register
    const { data: request, error: fetchErr } = await supabase
      .from('subdomain_requests')
      .select('*')
      .eq('id', id)
      .single<DbSubdomainRequest>();

    if (fetchErr || !request) return res.status(404).json({ error: 'Request not found' }) as unknown as void;
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already resolved' }) as unknown as void;

    // Double-check the subdomain hasn't been registered since the request was made
    const { data: existing } = await supabase
      .from('tags').select('id').eq('fqdn', request.fqdn).single();
    if (existing) return res.status(409).json({ error: `${request.fqdn} is already registered` }) as unknown as void;

    // Register the subdomain in the tags table
    await supabase.from('tags').insert({
      subdomain:  request.subdomain,
      domain:     request.domain,
      fqdn:       request.fqdn,
      owner_id:   request.requester_id,
    });

    // Mark the request as approved in the DB
    await supabase.from('subdomain_requests').update({ status: 'approved' }).eq('id', id);

    // Try to email the user — I don't let an email failure break the whole response
    try {
      await sendSubdomainRequest({
        name:      request.name,
        email:     request.requester_email,
        subdomain: request.subdomain,
        domain:    request.domain,
        fqdn:      request.fqdn,
        useCase:   'APPROVED',
        message:   `Your subdomain ${request.fqdn} is now active. Log in to configure DNS.`,
      });
    } catch (emailErr) {
      console.warn('Approval email failed (non-fatal):', (emailErr as Error).message);
    }

    res.json({ message: `${request.fqdn} approved and registered` });
  } catch (err) { next(err); }
});

// ── POST /api/admin/requests/:id/reject ──────────────────────
router.post('/requests/:id/reject', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { data: request } = await supabase
      .from('subdomain_requests').select('id').eq('id', id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' }) as unknown as void;

    await supabase.from('subdomain_requests').update({ status: 'rejected' }).eq('id', id);
    res.json({ message: 'Request rejected' });
  } catch (err) { next(err); }
});

export default router;
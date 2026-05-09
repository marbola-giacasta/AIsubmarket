// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// Add these THREE routes to backend/api/subdomains/routes.ts
// BEFORE the final export default router line.
//
// Also REPLACE the existing /requests/:id/dismiss route.
// ─────────────────────────────────────────────────────────────

// REPLACE existing dismiss route — now allows approved + rejected
router.post('/requests/:id/dismiss', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request } = await supabase
      .from('subdomain_requests')
      .select('id, status')
      .eq('id', id)
      .eq('requester_id', req.user.id)
      .single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    // Block only pending — approved and rejected can both be dismissed
    if (request.status === 'pending') return res.status(400).json({ error: 'Cannot dismiss a pending request' });
    await supabase.from('subdomain_requests').update({ dismissed: true }).eq('id', id);
    res.json({ message: 'Request dismissed' });
  } catch (err) { next(err); }
});

// GET history — dismissed requests for the current user
router.get('/my-history', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('subdomain_requests')
      .select('id, fqdn, subdomain, domain, use_case, status, admin_note, price_usd, price_chf, price_eur, price_status, messages, created_at')
      .eq('requester_id', req.user.id)
      .eq('dismissed', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data });
  } catch (err) { next(err); }
});

// DELETE a single history record permanently
router.delete('/requests/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    // Verify ownership before deleting
    const { data: request } = await supabase
      .from('subdomain_requests')
      .select('id, requester_id')
      .eq('id', id)
      .single();
    if (!request || request.requester_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await supabase.from('subdomain_requests').delete().eq('id', id);
    res.json({ message: 'Record deleted' });
  } catch (err) { next(err); }
});

// DELETE all dismissed history for this user
router.delete('/my-history/all', requireAuth, async (req, res, next) => {
  try {
    await supabase
      .from('subdomain_requests')
      .delete()
      .eq('requester_id', req.user.id)
      .eq('dismissed', true);
    res.json({ message: 'History cleared' });
  } catch (err) { next(err); }
});

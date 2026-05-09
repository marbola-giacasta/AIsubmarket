// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// Add these two routes to backend/api/admin/routes.ts
// BEFORE the export default router line at the bottom.
//
// GET  /api/admin/requests/:id/messages  → fetch messages
// POST /api/admin/requests/:id/message   → admin sends message
// ─────────────────────────────────────────────────────────────

async function appendMessage(supabase, requestId, sender, text) {
  const { data: req } = await supabase
    .from('subdomain_requests')
    .select('messages')
    .eq('id', requestId)
    .single();

  const current = Array.isArray(req?.messages) ? req.messages : [];
  const newMsg  = {
    id:      Math.random().toString(36).slice(2),
    sender,
    text,
    sent_at: new Date().toISOString(),
  };
  const updated = [...current, newMsg];
  await supabase.from('subdomain_requests').update({ messages: updated }).eq('id', requestId);
  return updated;
}

// GET — fetch messages (admin side, for polling)
router.get('/requests/:id/messages', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request } = await supabase
      .from('subdomain_requests')
      .select('messages')
      .eq('id', id)
      .single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ messages: request.messages || [] });
  } catch (err) { next(err); }
});

// POST — admin sends a message
router.post('/requests/:id/message', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const { data: request } = await supabase
      .from('subdomain_requests')
      .select('id')
      .eq('id', id)
      .single();
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const updated = await appendMessage(supabase, id, 'admin', text.trim());
    res.json({ messages: updated });
  } catch (err) { next(err); }
});

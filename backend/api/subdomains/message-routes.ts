// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// Add these two routes to backend/api/subdomains/routes.ts
// BEFORE the module.exports = router line at the bottom.
//
// GET  /api/subdomains/requests/:id/messages  → fetch messages
// POST /api/subdomains/requests/:id/message   → user sends message
// ─────────────────────────────────────────────────────────────

// Helper: append a message object to the JSONB array atomically
async function appendMessage(supabase, requestId, sender, text) {
  // Read current array, append, write back
  const { data: req } = await supabase
    .from('subdomain_requests')
    .select('messages')
    .eq('id', requestId)
    .single();

  const current = Array.isArray(req?.messages) ? req.messages : [];
  const newMsg  = {
    id:      crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    sender,
    text,
    sent_at: new Date().toISOString(),
  };
  const updated = [...current, newMsg];

  await supabase
    .from('subdomain_requests')
    .update({ messages: updated })
    .eq('id', requestId);

  return updated;
}

// GET — fetch messages for a request (user side)
router.get('/requests/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request } = await supabase
      .from('subdomain_requests')
      .select('messages, requester_id')
      .eq('id', id)
      .single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.requester_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json({ messages: request.messages || [] });
  } catch (err) { next(err); }
});

// POST — user sends a message
router.post('/requests/:id/message', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    // Verify this request belongs to the user
    const { data: request } = await supabase
      .from('subdomain_requests')
      .select('requester_id, status')
      .eq('id', id)
      .single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.requester_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updated = await appendMessage(supabase, id, 'user', text.trim());
    res.json({ messages: updated });
  } catch (err) { next(err); }
});

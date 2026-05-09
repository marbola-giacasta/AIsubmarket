// @ts-nocheck
// Added: POST /api/subdomains/requests/:id/dismiss
// Marks a rejected request as dismissed so it no longer
// appears in the user's my-requests list.

const express   = require('express');
const supabase  = require('../../lib/database').default;
const { requireAuth } = require('../../middleware/auth');
const { createDnsRecord, updateDnsRecord, deleteDnsRecord, ZONE_MAP } = require('../../lib/cloudflare');
const { sendSubdomainRequest } = require('../../lib/email');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const router = express.Router();
const AVAILABLE_DOMAINS = Object.keys(ZONE_MAP);
const VALID_DNS_TYPES   = ['A', 'CNAME', 'MX', 'TXT', 'AAAA'];
const SUBDOMAIN_PRICE   = Number(process.env.SUBDOMAIN_PRICE_CENTS) || 999;

function validateSubdomain(s) { return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(s); }
async function isAvailable(fqdn) { const { data } = await supabase.from('tags').select('id').eq('fqdn', fqdn).single(); return !data; }

router.get('/domains', (_req, res) => res.json({ domains: AVAILABLE_DOMAINS }));

router.get('/check', async (req, res, next) => {
  try {
    const { subdomain, domain } = req.query;
    if (!subdomain || !domain) return res.status(400).json({ error: 'subdomain and domain are required' });
    res.json({ available: await isAvailable(`${subdomain}.${domain}`), fqdn: `${subdomain}.${domain}` });
  } catch (err) { next(err); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('tags').select('*').eq('owner_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ subdomains: data });
  } catch (err) { next(err); }
});

// Returns requests for this user — excludes dismissed ones
router.get('/my-requests', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('subdomain_requests')
      .select('id, fqdn, subdomain, domain, use_case, status, admin_note, admin_comment, price_usd, price_chf, price_eur, price_status, created_at')
      .eq('requester_id', req.user.id)
      .eq('dismissed', false)   // never return dismissed requests
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ requests: data });
  } catch (err) { next(err); }
});

// User dismisses a rejected request — hides it from their list permanently
router.post('/requests/:id/dismiss', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    // Verify ownership and that it is actually rejected before dismissing
    const { data: request } = await supabase
      .from('subdomain_requests')
      .select('id, status')
      .eq('id', id)
      .eq('requester_id', req.user.id)
      .single();
    if (!request)                    return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'rejected') return res.status(400).json({ error: 'Only rejected requests can be dismissed' });
    await supabase.from('subdomain_requests').update({ dismissed: true }).eq('id', id);
    res.json({ message: 'Request dismissed' });
  } catch (err) { next(err); }
});

// User accepts a price proposal
router.post('/requests/:id/accept-price', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', id).eq('requester_id', req.user.id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.price_status !== 'proposed') return res.status(400).json({ error: 'No active price proposal' });
    await supabase.from('subdomain_requests').update({ price_status: 'accepted' }).eq('id', id);
    res.json({ message: 'Price accepted. The admin will now register your subdomain.' });
  } catch (err) { next(err); }
});

// User declines a price proposal
router.post('/requests/:id/decline-price', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request } = await supabase.from('subdomain_requests').select('*').eq('id', id).eq('requester_id', req.user.id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.price_status !== 'proposed') return res.status(400).json({ error: 'No active price proposal' });
    await supabase.from('subdomain_requests').update({ price_status: 'declined' }).eq('id', id);
    res.json({ message: 'Price declined.' });
  } catch (err) { next(err); }
});

// User cancels subscription renewal
router.post('/:id/cancel-subscription', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: tag } = await supabase
      .from('tags').select('*').eq('id', id).eq('owner_id', req.user.id).single();
    if (!tag) return res.status(404).json({ error: 'Subdomain not found' });

    // Delete Cloudflare DNS record if exists
    if (tag.dns_record_id) {
      try { await deleteDnsRecord({ domain: tag.domain, recordId: tag.dns_record_id }); }
      catch (e) { console.warn('CF DNS delete warning:', e.message); }
    }

    // Fully delete the tag — releases subdomain for repurchase
    await supabase.from('tags').delete().eq('id', id);
    res.json({ message: `${tag.fqdn} released successfully.` });
  } catch (err) { next(err); }
});

router.post('/purchase', requireAuth, async (req, res, next) => {
  try {
    const { subdomain, domain } = req.body;
    if (!subdomain || !domain) return res.status(400).json({ error: 'subdomain and domain are required' });
    if (!AVAILABLE_DOMAINS.includes(domain) || !validateSubdomain(subdomain)) return res.status(400).json({ error: 'Invalid subdomain' });
    const fqdn = `${subdomain}.${domain}`;
    if (!(await isAvailable(fqdn))) return res.status(409).json({ error: `${fqdn} is already taken` });
    const { data: tag, error } = await supabase.from('tags').insert({ subdomain, domain, fqdn, owner_id: req.user.id }).select('*').single();
    if (error) throw error;
    res.status(201).json({ subdomain: tag });
  } catch (err) { next(err); }
});

router.post('/request', requireAuth, async (req, res, next) => {
  try {
    const { subdomain, domain, name, useCase, message } = req.body;
    if (!subdomain || !domain || !name || !useCase) return res.status(400).json({ error: 'Missing required fields' });
    if (!AVAILABLE_DOMAINS.includes(domain) || !validateSubdomain(subdomain)) return res.status(400).json({ error: 'Invalid subdomain' });
    const fqdn = `${subdomain}.${domain}`;
    if (!(await isAvailable(fqdn))) return res.status(409).json({ error: `${fqdn} is already taken` });
    const { data: request, error: dbErr } = await supabase.from('subdomain_requests')
      .insert({ subdomain, domain, fqdn, requester_id: req.user.id, requester_email: req.user.email, name, use_case: useCase, message: message || null, status: 'pending' })
      .select('*').single();
    if (dbErr) throw dbErr;
    await sendSubdomainRequest({ name, email: req.user.email, subdomain, domain, fqdn, useCase, message });
    res.status(201).json({ request, message: 'Request submitted!' });
  } catch (err) { next(err); }
});

router.post('/stripe-session', requireAuth, async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { subdomain, domain } = req.body;
    const fqdn = `${subdomain}.${domain}`;
    if (!AVAILABLE_DOMAINS.includes(domain) || !validateSubdomain(subdomain)) return res.status(400).json({ error: 'Invalid subdomain' });
    if (!(await isAvailable(fqdn))) return res.status(409).json({ error: `${fqdn} is already taken` });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `Subdomain: ${fqdn}` }, unit_amount: SUBDOMAIN_PRICE }, quantity: 1 }],
      mode: 'payment',
      metadata: { subdomain, domain, fqdn, user_id: req.user.id },
      success_url: `${frontendUrl}/dashboard?stripe=success&subdomain=${subdomain}&domain=${domain}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${frontendUrl}/purchase?stripe=cancelled`,
      customer_email: req.user.email,
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) { next(err); }
});

router.post('/stripe-success', requireAuth, async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Payment not completed' });
    const { subdomain, domain, fqdn, user_id } = session.metadata;
    if (user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (!(await isAvailable(fqdn))) return res.status(409).json({ error: `${fqdn} is already taken` });
    const { data: tag, error } = await supabase.from('tags').insert({ subdomain, domain, fqdn, owner_id: req.user.id }).select('*').single();
    if (error) throw error;
    res.status(201).json({ subdomain: tag });
  } catch (err) { next(err); }
});

router.put('/:id/dns', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dns_type, dns_value, dns_proxied = false, dns_ttl = 3600 } = req.body;
    if (!dns_type || !dns_value) return res.status(400).json({ error: 'dns_type and dns_value are required' });
    if (!VALID_DNS_TYPES.includes(dns_type)) return res.status(400).json({ error: 'Invalid dns_type' });
    const { data: tag } = await supabase.from('tags').select('*').eq('id', id).eq('owner_id', req.user.id).single();
    if (!tag) return res.status(404).json({ error: 'Subdomain not found' });
    let recordId = tag.dns_record_id;
    if (recordId) { await updateDnsRecord({ domain: tag.domain, recordId, type: dns_type, value: dns_value, proxied: dns_proxied, ttl: dns_ttl }); }
    else          { recordId = await createDnsRecord({ domain: tag.domain, subdomain: tag.subdomain, type: dns_type, value: dns_value, proxied: dns_proxied, ttl: dns_ttl }); }
    const { data: updated } = await supabase.from('tags').update({ dns_record_id: recordId, dns_type, dns_value, dns_proxied: dns_proxied ? 1 : 0, dns_ttl, dns_updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    res.json({ subdomain: updated });
  } catch (err) { next(err); }
});

router.delete('/:id/dns', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: tag } = await supabase.from('tags').select('*').eq('id', id).eq('owner_id', req.user.id).single();
    if (!tag || !tag.dns_record_id) return res.status(404).json({ error: 'Not found' });
    await deleteDnsRecord({ domain: tag.domain, recordId: tag.dns_record_id });
    await supabase.from('tags').update({ dns_record_id: null, dns_type: null, dns_value: null, dns_proxied: 0 }).eq('id', id);
    res.json({ message: 'DNS record deleted' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: tag } = await supabase.from('tags').select('*').eq('id', id).eq('owner_id', req.user.id).single();
    if (!tag) return res.status(404).json({ error: 'Subdomain not found' });
    if (tag.dns_record_id) { try { await deleteDnsRecord({ domain: tag.domain, recordId: tag.dns_record_id }); } catch(e){} }
    await supabase.from('tags').delete().eq('id', id);
    res.json({ message: 'Subdomain released' });
  } catch (err) { next(err); }
});

// GET messages for a request (user side)
router.get('/requests/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { data: request } = await supabase
      .from('subdomain_requests').select('messages, requester_id').eq('id', req.params.id).single();
    if (!request || request.requester_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json({ messages: request.messages || [] });
  } catch (err) { next(err); }
});

// POST user sends a message
router.post('/requests/:id/message', requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
    const { data: request } = await supabase
      .from('subdomain_requests').select('requester_id, messages').eq('id', req.params.id).single();
    if (!request || request.requester_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const msgs = [...(Array.isArray(request.messages) ? request.messages : []),
      { id: Date.now().toString(), sender: 'user', text: text.trim(), sent_at: new Date().toISOString() }];
    await supabase.from('subdomain_requests').update({ messages: msgs, admin_archived: false, }).eq('id', req.params.id);
    res.json({ messages: msgs });
  } catch (err) { next(err); }
});

router.post('/requests/:id/dismiss', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: request } = await supabase
      .from('subdomain_requests').select('id, status')
      .eq('id', id).eq('requester_id', req.user.id).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status === 'pending') return res.status(400).json({ error: 'Cannot dismiss a pending request' });
    await supabase.from('subdomain_requests').update({ dismissed: true }).eq('id', id);
    res.json({ message: 'Request dismissed' });
  } catch (err) { next(err); }
});

export default router;

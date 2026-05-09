// @ts-nocheck
// Added: POST /admin/requests/:id/reregister
// Allows admin to re-create the tag for an approved request
// whose tag was previously deleted (e.g. by old cancel code).

import { Router } from 'express';
import supabase from '../../lib/database';
import { requireAuth } from '../../middleware/auth';
import { sendSubdomainRequest } from '../../lib/email';

const router = Router();
const now = () => new Date().toISOString();

async function requireAdmin(req, res, next) {
  const { data:u } = await supabase.from('users').select('is_admin').eq('id',req.user.id).single();
  if (!u?.is_admin) { res.status(403).json({ error:'Admin access required' }); return; }
  next();
}

// GET /requests — enriched with live tag state
router.get('/requests', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    let { data:requests, error } = await supabase
      .from('subdomain_requests').select('*')
      .eq('admin_archived', false).order('created_at',{ascending:false});
    if (error&&error.message?.includes('admin_archived')) {
      const fb=await supabase.from('subdomain_requests').select('*').order('created_at',{ascending:false});
      requests=fb.data; error=fb.error;
    }
    if (error) throw error;

    const approvedFqdns=(requests||[]).filter(r=>r.status==='approved').map(r=>r.fqdn);
    const tagMap=new Map();
    if (approvedFqdns.length>0) {
      const { data:liveTags }=await supabase.from('tags')
        .select('fqdn,dns_type,dns_value,dns_events,subscription_cancelled,subscription_cancel_date,dns_updated_at,price_usd,price_chf,price_eur')
        .in('fqdn',approvedFqdns);
      (liveTags||[]).forEach(t=>tagMap.set(t.fqdn,t));
    }

    const enriched=(requests||[]).map(r=>{
      if (r.status!=='approved') return r;
      const tag=tagMap.get(r.fqdn);
      return {
        ...r,
        tag_exists:          !!tag,
        tag_cancelled:       tag?!!tag.subscription_cancelled:false,
        tag_cancel_date:     tag?tag.subscription_cancel_date:null,
        tag_has_dns:         tag?!!(tag.dns_type&&tag.dns_value):false,
        tag_dns_type:        tag?tag.dns_type:null,
        tag_dns_value:       tag?tag.dns_value:null,
        tag_dns_updated_at:  tag?tag.dns_updated_at:null,
        tag_dns_events:      tag?tag.dns_events:[],
      };
    });
    res.json({ requests:enriched });
  } catch(err){next(err);}
});

// GET /requests/history
router.get('/requests/history', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    let { data,error }=await supabase.from('subdomain_requests').select('*').eq('admin_archived',true).order('created_at',{ascending:false});
    if (error&&error.message?.includes('admin_archived')) return res.json({ requests:[] });
    if (error) throw error;

    // Also enrich history with tag data for the full picture
    const approvedFqdns=(data||[]).filter(r=>r.status==='approved').map(r=>r.fqdn);
    const tagMap=new Map();
    if (approvedFqdns.length>0) {
      const { data:tags }=await supabase.from('tags')
        .select('fqdn,dns_type,dns_value,dns_events,subscription_cancelled,subscription_cancel_date')
        .in('fqdn',approvedFqdns);
      (tags||[]).forEach(t=>tagMap.set(t.fqdn,t));
    }
    const enriched=(data||[]).map(r=>{
      if (r.status!=='approved') return r;
      const tag=tagMap.get(r.fqdn);
      return { ...r, tag_data: tag||null };
    });
    res.json({ requests:enriched });
  } catch(err){next(err);}
});

// POST /requests/:id/reregister — re-create tag for approved request whose tag was deleted
router.post('/requests/:id/reregister', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data:r }=await supabase.from('subdomain_requests').select('*').eq('id',req.params.id).single();
    if (!r) return res.status(404).json({ error:'Request not found' });
    if (r.status!=='approved') return res.status(400).json({ error:'Only approved requests can be re-registered' });

    // Check if a non-cancelled tag already exists
    const { data:existing }=await supabase.from('tags').select('id').eq('fqdn',r.fqdn).eq('subscription_cancelled',false).single();
    if (existing) return res.status(409).json({ error:`${r.fqdn} is already active` });

    const pa=r.price_status==='accepted';
    const { error:insertErr }=await supabase.from('tags').insert({
      subdomain:r.subdomain, domain:r.domain, fqdn:r.fqdn, owner_id:r.requester_id,
      price_usd:pa?r.price_usd:null, price_chf:pa?r.price_chf:null, price_eur:pa?r.price_eur:null,
      subscription_cancelled:false, subscription_active:true,
      dns_events:[{ event:'re-registered_by_admin', at:now() }],
    });
    if (insertErr) throw insertErr;
    res.json({ message:`${r.fqdn} re-registered successfully` });
  } catch(err){next(err);}
});

// GET /subdomains — two separate queries (no FK)
router.get('/subdomains', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [tagsRes,usersRes]=await Promise.all([
      supabase.from('tags').select('*').order('created_at',{ascending:false}),
      supabase.from('users').select('id,email'),
    ]);
    if (tagsRes.error) throw tagsRes.error;
    if (usersRes.error) throw usersRes.error;
    const userMap=Object.fromEntries((usersRes.data||[]).map(u=>[u.id,u.email]));
    res.json({ subdomains:(tagsRes.data||[]).map(t=>({...t,owner_email:userMap[t.owner_id]||null})) });
  } catch(err){next(err);}
});

// GET /users
router.get('/users', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data:users,error }=await supabase.from('users').select('id,email,is_admin,created_at').order('created_at',{ascending:false});
    if (error) throw error;
    const wc=await Promise.all((users??[]).map(async u=>{
      const { count }=await supabase.from('tags').select('*',{count:'exact',head:true}).eq('owner_id',u.id);
      return {...u,domain_count:count??0};
    }));
    res.json({ users:wc });
  } catch(err){next(err);}
});

router.post('/requests/:id/archive', requireAuth, requireAdmin, async (req,res,next) => {
  try { await supabase.from('subdomain_requests').update({admin_archived:true}).eq('id',req.params.id); res.json({message:'Archived'}); }
  catch(err){next(err);}
});
router.delete('/requests/:id', requireAuth, requireAdmin, async (req,res,next) => {
  try { await supabase.from('subdomain_requests').delete().eq('id',req.params.id); res.json({message:'Deleted'}); }
  catch(err){next(err);}
});
router.delete('/requests/history/all', requireAuth, requireAdmin, async (_req,res,next) => {
  try { await supabase.from('subdomain_requests').delete().eq('admin_archived',true); res.json({message:'History cleared'}); }
  catch(err){next(err);}
});
router.post('/requests/:id/comment', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const ac=req.body?.admin_comment?.trim();
    if (!ac) return res.status(400).json({error:'admin_comment required'});
    await supabase.from('subdomain_requests').update({admin_comment:ac}).eq('id',req.params.id);
    res.json({message:'Comment saved'});
  } catch(err){next(err);}
});
router.post('/requests/:id/propose-price', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const { price_usd,price_chf,price_eur }=req.body;
    if (!price_usd&&!price_chf&&!price_eur) return res.status(400).json({error:'At least one price required'});
    const { data:r }=await supabase.from('subdomain_requests').select('*').eq('id',req.params.id).single();
    if (!r||r.status!=='pending') return res.status(400).json({error:'Invalid request'});
    await supabase.from('subdomain_requests').update({price_usd:price_usd?Number(price_usd):null,price_chf:price_chf?Number(price_chf):null,price_eur:price_eur?Number(price_eur):null,price_status:'proposed'}).eq('id',req.params.id);
    res.json({message:'Price proposal sent'});
  } catch(err){next(err);}
});
router.post('/requests/:id/approve', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const admin_note=req.body?.admin_note?.trim()||null;
    const { data:r }=await supabase.from('subdomain_requests').select('*').eq('id',req.params.id).single();
    if (!r) return res.status(404).json({error:'Not found'});
    if (r.status!=='pending') return res.status(400).json({error:'Already resolved'});
    const { data:existing }=await supabase.from('tags').select('id').eq('fqdn',r.fqdn).eq('subscription_cancelled',false).single();
    if (existing) return res.status(409).json({error:`${r.fqdn} already registered`});
    const pa=r.price_status==='accepted';
    await supabase.from('tags').insert({subdomain:r.subdomain,domain:r.domain,fqdn:r.fqdn,owner_id:r.requester_id,price_usd:pa?r.price_usd:null,price_chf:pa?r.price_chf:null,price_eur:pa?r.price_eur:null,subscription_cancelled:false,subscription_active:true,dns_events:[]});
    await supabase.from('subdomain_requests').update({status:'approved',admin_note}).eq('id',req.params.id);
    try{await sendSubdomainRequest({name:r.name,email:r.requester_email,subdomain:r.subdomain,domain:r.domain,fqdn:r.fqdn,useCase:'APPROVED',message:admin_note||`${r.fqdn} is now active.`});}catch(e){}
    res.json({message:`${r.fqdn} approved`});
  } catch(err){next(err);}
});
router.post('/requests/:id/reject', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    await supabase.from('subdomain_requests').update({status:'rejected',admin_note:req.body?.admin_note?.trim()||null}).eq('id',req.params.id);
    res.json({message:'Rejected'});
  } catch(err){next(err);}
});
router.post('/subdomains/:id/cancel-subscription', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const { data:tag }=await supabase.from('tags').select('dns_events').eq('id',req.params.id).single();
    const events=Array.isArray(tag?.dns_events)?tag.dns_events:[];
    await supabase.from('tags').update({subscription_cancelled:true,subscription_cancel_date:now(),dns_events:[...events,{event:'subscription_cancelled',at:now()}]}).eq('id',req.params.id);
    res.json({message:'Subscription cancelled'});
  } catch(err){next(err);}
});
router.get('/requests/:id/messages', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const { data:r }=await supabase.from('subdomain_requests').select('messages').eq('id',req.params.id).single();
    if (!r) return res.status(404).json({error:'Not found'});
    res.json({messages:r.messages||[]});
  } catch(err){next(err);}
});
router.post('/requests/:id/message', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const { text }=req.body;
    if (!text?.trim()) return res.status(400).json({error:'text required'});
    const { data:r }=await supabase.from('subdomain_requests').select('messages').eq('id',req.params.id).single();
    if (!r) return res.status(404).json({error:'Not found'});
    const msgs=[...(Array.isArray(r.messages)?r.messages:[]),{id:Date.now().toString(),sender:'admin',text:text.trim(),sent_at:now()}];
    await supabase.from('subdomain_requests').update({messages:msgs}).eq('id',req.params.id);
    res.json({messages:msgs});
  } catch(err){next(err);}
});
router.get('/root-domains', requireAuth, requireAdmin, async (_req,res,next) => {
  try { const {data,error}=await supabase.from('root_domains').select('*').order('created_at',{ascending:true}); if(error)throw error; res.json({domains:data}); }
  catch(err){next(err);}
});
router.post('/root-domains', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const {domain,zone_id,description,active=true}=req.body;
    if (!domain||!zone_id) return res.status(400).json({error:'domain and zone_id required'});
    const {data,error}=await supabase.from('root_domains').insert({domain,zone_id,description:description||null,active}).select('*').single();
    if (error){if(error.code==='23505')return res.status(409).json({error:`${domain} already exists`});throw error;}
    res.status(201).json({domain:data});
  } catch(err){next(err);}
});
router.put('/root-domains/:id', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const u={};
    if(req.body.zone_id!==undefined)u.zone_id=req.body.zone_id;
    if(req.body.description!==undefined)u.description=req.body.description;
    if(req.body.active!==undefined)u.active=req.body.active;
    const {data,error}=await supabase.from('root_domains').update(u).eq('id',req.params.id).select('*').single();
    if(error)throw error; res.json({domain:data});
  } catch(err){next(err);}
});
router.delete('/root-domains/:id', requireAuth, requireAdmin, async (req,res,next) => {
  try {
    const {data:dom}=await supabase.from('root_domains').select('domain').eq('id',req.params.id).single();
    if (!dom) return res.status(404).json({error:'Not found'});
    const {count}=await supabase.from('tags').select('*',{count:'exact',head:true}).eq('domain',dom.domain);
    if (count&&count>0) return res.status(409).json({error:`Cannot delete: ${count} subdomain(s) on ${dom.domain}`});
    await supabase.from('root_domains').delete().eq('id',req.params.id);
    res.json({message:`${dom.domain} removed`});
  } catch(err){next(err);}
});

export default router;

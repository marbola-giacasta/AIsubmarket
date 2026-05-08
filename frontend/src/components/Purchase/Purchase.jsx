import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../../services/api';
import RequestFormModal from './RequestFormModal';
import { useIsMobile } from '../../hooks/useIsMobile';
import Btn from '../UI/Btn';

const DOMAIN_META = {
  'open-ai.ch':      { zone:'CH' },
  'open-ai.live':    { zone:'GLOBAL' },
  'geminai.info':    { zone:'INFO' },
  'course-ai.co.uk': { zone:'UK' },
};

export default function Purchase() {
  const isMobile = useIsMobile(640);
  const [searchParams] = useSearchParams();
  const [domains,       setDomains]       = useState([]);
  const [domain,        setDomain]        = useState('');
  const [subdomain,     setSubdomain]     = useState('');
  const [avail,         setAvail]         = useState(null);
  const [checking,      setChecking]      = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [successMsg,    setSuccessMsg]    = useState('');
  const [error,         setError]         = useState('');
  const debounce = useRef(null);

  useEffect(() => {
    if (searchParams.get('stripe') === 'cancelled') setError('Payment cancelled -- no charge was made.');
  }, []);

  useEffect(() => {
    api.getDomains().then(({ domains }) => { setDomains(domains); setDomain(domains[0] || ''); }).catch(console.error);
  }, []);

  useEffect(() => {
    setAvail(null);
    if (!subdomain || !domain) return;
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) { setAvail({ available:false, invalid:true }); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setChecking(true);
      try { const r = await api.checkAvailability(subdomain, domain); setAvail(r); }
      catch { setAvail(null); } finally { setChecking(false); }
    }, 500);
    return () => clearTimeout(debounce.current);
  }, [subdomain, domain]);

  async function handleStripe() {
    setError('');
    setStripeLoading(true);
    try { const { url } = await api.createStripeSession(subdomain, domain); window.location.href = url; }
    catch (err) { setError(err.message); setStripeLoading(false); }
  }

  function handleFormSuccess() {
    setShowForm(false);
    setSuccessMsg(`${subdomain}.${domain}`);
    setSubdomain('');
    setAvail(null);
  }

  const fqdn     = subdomain && domain ? `${subdomain}.${domain}` : null;
  const canClaim = avail?.available && !checking;

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={s.header}>
        <div style={s.breadcrumb}>
          <span style={{ color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'11px' }}># submarket &gt; </span>
          <span style={{ color:'var(--green)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>purchase.js</span>
          <span style={{ color:'var(--comment)', fontFamily:'var(--font-mono)', fontSize:'11px', marginLeft:'10px' }}>// register a new subdomain</span>
        </div>
        <h1 style={s.title}>BUY A DOMAIN</h1>
      </div>

      {successMsg && (
        <div style={s.ok}>OK -- request submitted -- <strong style={{ color:'var(--green)' }}>{successMsg}</strong> -- we will contact you within 24h</div>
      )}

      {/* Search editor block */}
      <div style={s.editor}>
        <div style={s.editorHead}>
          <span style={s.lineNo}>1</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px' }}>
            <span style={{ color:'var(--green)' }}>const </span>
            <span style={{ color:'var(--gold)' }}>target</span>
            <span style={{ color:'var(--muted)' }}> = </span>
            <span style={{ color:'var(--comment)' }}>// type below</span>
          </span>
        </div>

        <div style={s.inputLine}>
          <span style={s.lineNo}>2</span>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px' }}>"</span>
          <input
            value={subdomain}
            onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}
            placeholder="yourname"
            style={s.subInput}
            spellCheck={false}
          />
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'24px' }}>.</span>
          <select value={domain} onChange={e => setDomain(e.target.value)} style={s.domSelect}>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px' }}>"</span>
        </div>

        <div style={s.statusLine}>
          <span style={s.lineNo}>3</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', padding:'0 10px' }}>
            {!fqdn && <span style={{ color:'var(--comment)' }}>// enter a name to check availability</span>}
            {fqdn && checking && <span style={{ color:'var(--muted)' }}>// checking...</span>}
            {fqdn && !checking && avail?.invalid && <span style={{ color:'var(--red)' }}>ERR -- invalid format [a-z0-9-] only</span>}
            {fqdn && !checking && avail?.available === true  && <span><span style={{ color:'var(--green)', fontFamily:'var(--font-display)', letterSpacing:'0.5px' }}>AVAILABLE</span><span style={{ color:'var(--muted)' }}> -- {fqdn}</span></span>}
            {fqdn && !checking && avail?.available === false && !avail?.invalid && <span style={{ color:'var(--red)' }}>TAKEN -- {fqdn} already registered</span>}
          </span>
        </div>
        {error && (
          <div style={s.statusLine}>
            <span style={s.lineNo}>!</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', padding:'0 10px', color:'var(--red)' }}>ERR -- {error}</span>
          </div>
        )}
      </div>

      {/* CTA block */}
      <div style={{ ...s.ctaWrap, opacity: canClaim ? 1 : 0.3, pointerEvents: canClaim ? 'auto' : 'none' }}>
        <div style={s.ctaLabel}>// CHOOSE PAYMENT METHOD &#9658;</div>
        <div style={s.ctaRow}>
          {/* Method 01 */}
          <div style={s.ctaCard}>
            <div style={s.ctaMeta}>
              <span style={s.ctaNum}>METHOD_01</span>
              <span style={s.ctaSubtitle}>manual review</span>
            </div>
            <div style={s.ctaArrow}>&#9658;&#9658;</div>
            <div style={s.ctaContent}>
              <span style={s.ctaName}>submit_request()</span>
              <span style={s.ctaDesc}>fill a form -- we review -- pay manually</span>
              <Btn variant="blue" onClick={() => setShowForm(true)} style={{ marginTop:'10px' }}>
                &#9658; REQUEST THIS DOMAIN
              </Btn>
            </div>
          </div>

          {/* Method 02 */}
          <div style={{ ...s.ctaCard, background:'var(--surface-dark)', borderColor:'var(--green)' }}>
            <div style={s.ctaMeta}>
              <span style={{ ...s.ctaNum, color:'var(--comment)' }}>METHOD_02</span>
              <span style={{ ...s.ctaSubtitle, color:'var(--muted)' }}>instant -- $9.99</span>
            </div>
            <div style={{ ...s.ctaArrow, color:'var(--green)' }}>&#9658;&#9658;</div>
            <div style={s.ctaContent}>
              <span style={{ ...s.ctaName, color:'var(--green)' }}>stripe.checkout()</span>
              <span style={{ ...s.ctaDesc, color:'var(--muted)' }}>card payment -- auto-activate on success</span>
              <Btn variant="primary" onClick={handleStripe} disabled={stripeLoading} style={{ marginTop:'10px' }}>
                {stripeLoading ? '// redirecting...' : '&#9658; PAY WITH STRIPE'}
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Domain selector */}
      <div style={s.domBlock}>
        <div style={s.domHeader}>// AVAILABLE_DOMAINS[]</div>
        <div style={s.domGrid}>
          {domains.map(d => {
            const m = DOMAIN_META[d] || {};
            const active = domain === d;
            return (
              <button key={d} onClick={() => setDomain(d)}
                style={{ ...s.domCard, ...(active ? s.domCardActive : {}) }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'13px', color: active ? '#0A0A0A' : 'var(--text)', letterSpacing:'0.5px' }}>{d}</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'10px', color: active ? '#0A0A0A' : 'var(--muted)', letterSpacing:'1px' }}>{m.zone}</span>
                {active && <span style={{ fontFamily:'var(--font-display)', fontSize:'10px', color:'#0A0A0A', letterSpacing:'1px' }}>SELECTED</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Steps */}
      <div style={s.steps}>
        <div style={s.stepsHead}>// HOW_IT_WORKS()</div>
        <div style={s.stepsGrid}>
          {[
            { n:'01', fn:'search()',       body:'Check availability of your subdomain name' },
            { n:'02', fn:'claim()',        body:'Pay instantly via Stripe or submit manual request' },
            { n:'03', fn:'configure_dns()',body:'Point to Vercel, Netlify, GitHub Pages, or VPS' },
            { n:'04', fn:'go_live()',      body:'Cloudflare propagates globally in seconds' },
          ].map((step, i) => (
            <div key={step.n} style={s.step} className={`fade-up delay-${i+1}`}>
              <span style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'10px', display:'block', marginBottom:'6px' }}>// step_{step.n}</span>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'14px', color:'var(--blue)', letterSpacing:'0.5px', display:'block', marginBottom:'6px' }}>{step.fn}</span>
              <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'11px', lineHeight:1.6 }}>{step.body}</span>
            </div>
          ))}
        </div>
      </div>

      {showForm && fqdn && (
        <RequestFormModal subdomain={subdomain} domain={domain} fqdn={fqdn} onClose={() => setShowForm(false)} onSuccess={handleFormSuccess} />
      )}
    </div>
  );
}

const s = {
  header: { marginBottom:'24px' },
  breadcrumb: { marginBottom:'6px' },
  title: { fontFamily:'var(--font-display)', fontSize:'36px', letterSpacing:'2px' },
  ok: { padding:'8px 14px', background:'rgba(58,255,110,0.08)', border:'1px solid var(--green)', fontFamily:'var(--font-mono)', fontSize:'12px', marginBottom:'16px' },

  editor: { border:'1px solid var(--border)', borderTop:'2px solid var(--border-dark)', background:'var(--surface)', marginBottom:'16px' },
  editorHead: { display:'flex', alignItems:'center', padding:'8px 0', background:'var(--bg-2)', borderBottom:'1px solid var(--border)' },
  lineNo: { width:'40px', textAlign:'right', paddingRight:'10px', fontFamily:'var(--font-mono)', color:'var(--border)', fontSize:'11px', userSelect:'none', flexShrink:0 },
  inputLine: { display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', padding:'4px 0' },
  subInput: { flex:1, padding:'12px 4px', background:'transparent', border:'none', fontFamily:'var(--font-display)', color:'var(--text)', fontSize:'26px', letterSpacing:'-0.5px', outline:'none', minWidth:0 },
  domSelect: { padding:'8px 10px', background:'transparent', border:'none', fontFamily:'var(--font-display)', color:'var(--gold)', fontSize:'16px', letterSpacing:'0.5px', outline:'none', cursor:'pointer' },
  statusLine: { display:'flex', alignItems:'center', minHeight:'32px', padding:'4px 0' },

  ctaWrap: { marginBottom:'20px', transition:'opacity 0.2s' },
  ctaLabel: { fontFamily:'var(--font-display)', fontSize:'12px', color:'var(--muted)', letterSpacing:'1px', marginBottom:'8px' },
  ctaRow: { display:'grid', gridTemplateColumns:'1fr', gap:'2px', background:'var(--border)' },
  ctaCard: { display:'flex', gap:'14px', padding:'20px', background:'var(--surface)', border:'none', alignItems:'flex-start' },
  ctaMeta: { display:'flex', flexDirection:'column', gap:'4px', minWidth:'90px', borderRight:'1px solid var(--border)', paddingRight:'14px', flexShrink:0 },
  ctaNum: { fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px' },
  ctaSubtitle: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' },
  ctaArrow: { fontFamily:'var(--font-display)', fontSize:'16px', color:'var(--muted)', flexShrink:0, paddingTop:'2px' },
  ctaContent: { display:'flex', flexDirection:'column' },
  ctaName: { fontFamily:'var(--font-display)', fontSize:'16px', color:'var(--text)', letterSpacing:'0.5px', marginBottom:'4px' },
  ctaDesc: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' },

  domBlock: { border:'1px solid var(--border)', marginBottom:'20px', background:'var(--surface)' },
  domHeader: { padding:'8px 12px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px' },
  domGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'1px', background:'var(--border)' },
  domCard: { display:'flex', flexDirection:'column', gap:'4px', padding:'14px 16px', background:'var(--surface)', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.1s', fontFamily:'var(--font-display)' },
  domCardActive: { background:'var(--blue)', borderTop:'2px solid var(--green)' },

  steps: { border:'1px solid var(--border)', background:'var(--surface)' },
  stepsHead: { padding:'10px 14px 6px', fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px' },
  stepsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'1px', background:'var(--border)' },
  step: { padding:'16px', background:'var(--surface)' },
};

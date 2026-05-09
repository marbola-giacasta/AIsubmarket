// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// Purchase.tsx
// Key fixes in this version:
//  - ▶ Unicode character directly instead of &#9658; HTML entity
//    (HTML entities don't work inside JS string expressions in JSX)
//  - canClaim properly passed to onClick so buttons aren't dead
//  - Mobile layout stacks vertically
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../../services/api';
import RequestFormModal from './RequestFormModal';
import Btn from '../UI/Btn';
import { useIsMobile } from '../../hooks/useIsMobile';

const DOMAIN_META = {
  'open-ai.ch':      { zone:'CH' },
  'open-ai.live':    { zone:'GLOBAL' },
  'geminai.info':    { zone:'INFO' },
  'course-ai.co.uk': { zone:'UK' },
};

export default function Purchase() {
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile(640);
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
    api.getDomains()
      .then(({ domains }) => { setDomains(domains); setDomain(domains[0] || ''); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setAvail(null);
    if (!subdomain || !domain) return;
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      setAvail({ available: false, invalid: true });
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setChecking(true);
      try {
        const r = await api.checkAvailability(subdomain, domain);
        setAvail(r);
      } catch { setAvail(null); }
      finally { setChecking(false); }
    }, 500);
    return () => clearTimeout(debounce.current);
  }, [subdomain, domain]);

  async function handleStripe() {
    setError('');
    setStripeLoading(true);
    try {
      const { url } = await api.createStripeSession(subdomain, domain);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setStripeLoading(false);
    }
  }

  function handleFormSuccess() {
    setShowForm(false);
    setSuccessMsg(`${subdomain}.${domain}`);
    setSubdomain('');
    setAvail(null);
  }

  const fqdn     = subdomain && domain ? `${subdomain}.${domain}` : null;
  const canClaim = !!(avail?.available && !checking);

  return (
    <div className="fade-up">
      <div style={{ marginBottom:'6px' }}>
        <span style={{ color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'11px' }}># submarket &gt; </span>
        <span style={{ color:'var(--blue)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>purchase.js</span>
        {!isMobile && <span style={{ color:'var(--comment)', fontFamily:'var(--font-mono)', fontSize:'11px', marginLeft:'10px' }}>// register a new subdomain</span>}
      </div>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize: isMobile ? '26px' : '36px', letterSpacing:'2px', marginBottom:'20px' }}>BUY A DOMAIN</h1>

      {successMsg && (
        <div style={s.ok}>OK -- request submitted -- <strong style={{ color:'var(--green)' }}>{successMsg}</strong> -- we will contact you within 24h</div>
      )}

      {/* Search block */}
      <div style={s.editor}>
        <div style={{ display:'flex', alignItems:'center', padding:'8px 0', background:'var(--bg-2)', borderBottom:'1px solid var(--border)' }}>
          <span style={s.lineNo}>1</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px' }}>
            <span style={{ color:'var(--blue)' }}>const </span>
            <span style={{ color:'var(--gold)' }}>target</span>
            <span style={{ color:'var(--muted)' }}> = </span>
            <span style={{ color:'var(--comment)' }}>// type below</span>
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', padding:'4px 0', overflow:'hidden' }}>
          <span style={s.lineNo}>2</span>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 6px', flexShrink:0 }}>"</span>
          <input
            value={subdomain}
            onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}
            placeholder="subdomain you want to buy"
            style={{ flex:1, padding:'10px 4px', background:'transparent', border:'none', fontFamily:'var(--font-display)', color:'var(--text)', fontSize: isMobile ? '18px' : '22px', fontWeight:900, letterSpacing:'-0.5px', outline:'none', minWidth:0 }}
            spellCheck={false}
          />
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize: isMobile ? '18px' : '20px', flexShrink:0 }}>.</span>
          <select
            value={domain}
            onChange={e => setDomain(e.target.value)}
            style={{ padding:'8px 6px', background:'transparent', border:'none', fontFamily:'var(--font-display)', color:'var(--gold)', fontSize: isMobile ? '13px' : '15px', fontWeight:900, outline:'none', cursor:'pointer', flexShrink:0, maxWidth: isMobile ? '130px' : '200px' }}
          >
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 6px', flexShrink:0 }}>"</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', minHeight:'30px', padding:'4px 0' }}>
          <span style={s.lineNo}>3</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', padding:'0 10px' }}>
            {!fqdn && <span style={{ color:'var(--comment)' }}>// enter a name to check availability</span>}
            {fqdn && checking && <span style={{ color:'var(--muted)' }}>// checking...</span>}
            {fqdn && !checking && avail?.invalid && <span style={{ color:'var(--red)' }}>ERR -- use [a-z0-9-] only</span>}
            {fqdn && !checking && avail?.available === true  && <span><span style={{ color:'var(--green)', fontFamily:'var(--font-display)', letterSpacing:'0.5px' }}>AVAILABLE</span><span style={{ color:'var(--muted)' }}> -- {fqdn}</span></span>}
            {fqdn && !checking && avail?.available === false && !avail?.invalid && <span style={{ color:'var(--red)' }}>TAKEN -- {fqdn}</span>}
          </span>
        </div>
        {error && (
          <div style={{ display:'flex', alignItems:'center', padding:'4px 0' }}>
            <span style={s.lineNo}>!</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', padding:'0 10px', color:'var(--red)' }}>ERR -- {error}</span>
          </div>
        )}
      </div>

      {/* CTA block */}
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px', marginBottom:'8px' }}>// CHOOSE PAYMENT METHOD &#9658;</div>
        <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:'2px', background:'var(--border)' }}>

          {/* Method 01 — Manual request */}
          <div style={{ ...s.ctaCard, position:'relative', flex:1 }}>
            {!canClaim && <FragileStamp />}
            <div style={{ ...s.ctaInner, opacity: canClaim ? 1 : 0.5 }}>
              <div style={s.ctaMeta}>
                <span style={s.ctaNum}>METHOD_01</span>
                <span style={s.ctaSub}>manual review</span>
              </div>
              <div style={s.ctaArrow}>&#9658;&#9658;</div>
              <div style={s.ctaContent}>
                <span style={s.ctaName}>submit_request()</span>
                <span style={s.ctaDesc}>fill a form -- we review -- pay manually</span>
                <Btn variant="blue" onClick={() => canClaim && setShowForm(true)} style={{ marginTop:'10px' }} marquee>
                  &#9658; REQUEST THIS DOMAIN
                </Btn>
              </div>
            </div>
          </div>

          {/* Method 02 — Stripe */}
          <div style={{ ...s.ctaCard, background:'var(--surface-dark)', borderColor:'var(--green)', position:'relative', flex:1 }}>
            {!canClaim && <FragileStamp dark />}
            <div style={{ ...s.ctaInner, opacity: canClaim ? 1 : 0.5 }}>
              <div style={s.ctaMeta}>
                <span style={{ ...s.ctaNum, color:'var(--comment)' }}>METHOD_02</span>
                <span style={{ ...s.ctaSub, color:'var(--muted)' }}>instant -- $9.99</span>
              </div>
              <div style={{ ...s.ctaArrow, color:'var(--green)' }}>&#9658;&#9658;</div>
              <div style={s.ctaContent}>
                <span style={{ ...s.ctaName, color:'var(--green)' }}>stripe.checkout()</span>
                <span style={{ ...s.ctaDesc, color:'var(--muted)' }}>card payment -- auto-activate on success</span>
                <Btn variant="primary" onClick={() => canClaim && handleStripe()} disabled={stripeLoading} style={{ marginTop:'10px' }} marquee>
                  {stripeLoading ? '// redirecting...' : '▶ PAY WITH STRIPE'}
                </Btn>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Domain selector */}
      <div style={s.domBlock}>
        <div style={s.domHeader}>// AVAILABLE_DOMAINS[]</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'1px', background:'var(--border)' }}>
          {domains.map(d => {
            const m = DOMAIN_META[d] || {};
            const active = domain === d;
            return (
              <button key={d} onClick={() => setDomain(d)}
                style={{ display:'flex', flexDirection:'column', gap:'3px', padding:'12px 14px', background: active ? 'var(--blue)' : 'var(--surface)', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'var(--font-display)', transition:'background 0.1s' }}>
                <span style={{ fontSize:'12px', color: active ? '#F8F8F8' : 'var(--text)', letterSpacing:'0.5px' }}>{d}</span>
                <span style={{ fontSize:'10px', color: active ? 'rgba(255,255,255,0.7)' : 'var(--muted)', letterSpacing:'1px' }}>{m.zone}</span>
                {active && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.7)' }}>SELECTED</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Steps */}
      <div style={{ border:'1px solid var(--border)', background:'var(--surface)' }}>
        <div style={{ padding:'10px 14px 6px', fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px' }}>// HOW_IT_WORKS()</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'1px', background:'var(--border)' }}>
          {[
            { n:'01', fn:'search()',        body:'Check availability of your subdomain name' },
            { n:'02', fn:'claim()',         body:'Pay via Stripe or submit a manual request' },
            { n:'03', fn:'configure_dns()', body:'Point to Vercel, Netlify, GitHub Pages, or VPS' },
            { n:'04', fn:'go_live()',       body:'Cloudflare propagates globally in seconds' },
          ].map((step, i) => (
            <div key={step.n} style={{ padding:'14px', background:'var(--surface)' }} className={`fade-up delay-${i+1}`}>
              <span style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'10px', display:'block', marginBottom:'6px' }}>// step_{step.n}</span>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'12px', color:'var(--blue)', letterSpacing:'0.5px', display:'block', marginBottom:'6px' }}>{step.fn}</span>
              <span style={{ fontFamily:'var(--font-mono)', color:'var(--text-2, #3C3C3C)', fontSize:'11px', lineHeight:1.6 }}>{step.body}</span>
            </div>
          ))}
        </div>
      </div>

      {showForm && fqdn && (
        <RequestFormModal subdomain={subdomain} domain={domain} fqdn={fqdn}
          onClose={() => setShowForm(false)} onSuccess={handleFormSuccess} />
      )}
    </div>
  );
}

function FragileStamp({ dark = false }) {
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:2, pointerEvents:'none' }}>
      <div style={{
        border: '3px solid var(--red)', padding:'6px 14px', transform:'rotate(-8deg)',
        fontFamily:'var(--font-display)', fontSize:'clamp(10px,2vw,12px)', color:'var(--red)',
        letterSpacing:'1px', textAlign:'center', lineHeight:1.3, opacity:0.8,
        background: dark ? 'rgba(10,10,10,0.6)' : 'rgba(248,248,248,0.7)',
        backdropFilter:'blur(1px)', maxWidth:'80%',
      }}>
        ENTER A SUBDOMAIN<br />FIRST
      </div>
    </div>
  );
}

const s = {
  ok: { padding:'8px 14px', background:'rgba(58,255,110,0.08)', border:'1px solid var(--green)', fontFamily:'var(--font-mono)', fontSize:'12px', marginBottom:'16px' },
  editor: { border:'1px solid var(--border)', borderTop:'2px solid var(--border-dark)', background:'var(--surface)', marginBottom:'16px', overflow:'hidden' },
  lineNo: { width:'36px', textAlign:'right', paddingRight:'10px', fontFamily:'var(--font-mono)', color:'var(--border)', fontSize:'11px', userSelect:'none', flexShrink:0 },
  ctaCard: { background:'var(--surface)', border:'none', overflow:'hidden' },
  ctaInner: { display:'flex', gap:'10px', padding:'16px', alignItems:'flex-start', transition:'opacity 0.2s' },
  ctaMeta: { display:'flex', flexDirection:'column', gap:'3px', minWidth:'75px', borderRight:'1px solid var(--border)', paddingRight:'10px', flexShrink:0 },
  ctaNum: { fontFamily:'var(--font-display)', fontSize:'10px', color:'var(--muted)', letterSpacing:'1px' },
  ctaSub: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' },
  ctaArrow: { fontFamily:'var(--font-display)', fontSize:'12px', color:'var(--muted)', flexShrink:0, paddingTop:'2px' },
  ctaContent: { display:'flex', flexDirection:'column', flex:1, minWidth:0 },
  ctaName: { fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text)', letterSpacing:'0.5px', marginBottom:'4px' },
  ctaDesc: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', lineHeight:1.5 },
  domBlock: { border:'1px solid var(--border)', marginBottom:'20px', background:'var(--surface)', overflow:'hidden' },
  domHeader: { padding:'8px 12px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px' },
};
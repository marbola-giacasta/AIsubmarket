// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// LoginPage.tsx
// Desktop: dark terminal left, form right — side by side.
// Mobile:  dark banner on TOP (always visible), form below.
//          Using useIsMobile(768) so it triggers on all phones.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import Btn from '../UI/Btn';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function LoginPage() {
  const { loginUser } = useAuth();
  const isMobile = useIsMobile(768);   // 768 catches all phones and small tablets
  const [mode,    setMode]    = useState('login');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? api.login : api.register;
      const { token, user } = await fn(email, pass);
      loginUser(token, user);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    // The login page has its own full-height layout (no Layout wrapper)
    <div style={{ display:'flex', height:'100dvh', flexDirection: isMobile ? 'column' : 'row', overflow:'hidden' }}>

      {/* ── Dark section ── */}
      {isMobile ? (
        // Mobile: compact dark banner at the top
        <div style={s.mobileBanner}>
          <div style={s.bannerTop}>
            <span style={s.bannerLogo}># <span style={{ color:'var(--green)' }}>Sub</span>Market</span>
            <span style={s.bannerTag}>// AI subdomain registry</span>
          </div>
          <div style={s.bannerDomains}>
            {['open-ai.ch','open-ai.live','geminai.info','course-ai.co.uk'].map(d => (
              <span key={d} style={s.pill}>{d}</span>
            ))}
          </div>
        </div>
      ) : (
        // Desktop: full terminal panel on the left
        <div style={s.terminal}>
          <div style={s.termBar}>
            <span style={s.termTitle}>TERMINAL</span>
            <span style={s.termConn}>CONNECTED</span>
          </div>
          <div style={s.termBody}>
            <Line p="$"     c="#E8E8E8">whois submarket</Line>
            <Line p=">"     c="var(--comment)">AI subdomain registry</Line>
            <Blank />
            <Line p="const" c="var(--blue)"> domains = [</Line>
            {['open-ai.ch','open-ai.live','geminai.info','course-ai.co.uk'].map(d => (
              <div key={d} style={s.indent}>
                <span style={{ color:'var(--gold)' }}>"{d}"</span>
                <span style={{ color:'var(--muted)' }}>,</span>
              </div>
            ))}
            <Line p="" c="var(--blue)">]</Line>
            <Blank />
            <Line p=">" c="var(--teal)">subdomain.configure(dns)</Line>
            <Line p=">" c="var(--teal)">cloudflare.propagate()</Line>
            <Line p=">" c="var(--comment)">website.goLive() -- OK</Line>
            <Blank />
            <div style={{ fontSize:'13px' }}>
              <span style={{ color:'var(--muted)' }}>$ </span>
              <span className="cursor" />
            </div>
          </div>
          <div style={s.termBgLabel}>SUB<br />MARKET</div>
        </div>
      )}

      {/* ── Form section ── */}
      <div style={{
        ...s.formSide,
        // On mobile: scrollable, takes remaining height
        // On desktop: fixed width, centered
        flex:       isMobile ? 1 : undefined,
        width:      isMobile ? '100%' : 'clamp(300px, 40vw, 440px)',
        overflowY:  'auto',
        borderLeft: isMobile ? 'none' : '2px solid var(--green)',
        borderTop:  isMobile ? '2px solid var(--green)' : 'none',
      }}>
        <div className="fade-up" style={{ width:'100%', maxWidth:'380px' }}>
          {!isMobile && (
            <div style={{ marginBottom:'24px' }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'20px', color:'var(--text)', display:'block', marginBottom:'4px', letterSpacing:'1px' }}># SubMarket</span>
              <span style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' }}>// AI subdomain registry</span>
            </div>
          )}

          <div style={s.modeTabs}>
            <button style={{ ...s.modeTab, ...(mode==='login'    ? s.modeTabActive : {}) }} onClick={() => setMode('login')}>login.js</button>
            <button style={{ ...s.modeTab, ...(mode==='register' ? s.modeTabActive : {}) }} onClick={() => setMode('register')}>register.js</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <Field label="email"    type="email"    value={email} onChange={e => setEmail(e.target.value)} placeholder='"you@example.com"' />
            <Field label="password" type="password" value={pass}  onChange={e => setPass(e.target.value)}  placeholder={mode==='register' ? '"min 8 chars"' : '"........"'} />
            {error && <div style={s.error}>ERR: {error}</div>}
            <Btn type="submit" variant="primary" disabled={loading} marquee
              style={{ justifyContent:'flex-start', marginTop:'4px' }}>
              {loading ? '// loading...' : mode==='login' ? '> authenticate()' : '> createAccount()'}
            </Btn>
          </form>

          <p style={{ marginTop:'16px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)' }}>
            <span>// </span>
            <button style={{ background:'none', border:'none', color:'var(--teal)', fontFamily:'var(--font-mono)', fontSize:'12px', cursor:'pointer', textDecoration:'underline' }}
              onClick={() => setMode(mode==='login' ? 'register' : 'login')}>
              {mode==='login' ? 'switch to register.js' : 'switch to login.js'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div style={{ display:'flex', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)' }}>
      <span style={{ padding:'10px 10px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--gold)', borderRight:'1px solid var(--border)', minWidth:'130px', whiteSpace:'nowrap', flexShrink:0 }}>
        <span style={{ color:'var(--blue)' }}>const </span>{label}
      </span>
      <span style={{ padding:'0 8px', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px', flexShrink:0 }}>=</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required
        style={{ flex:1, padding:'10px 6px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'16px', outline:'none', minWidth:0 }} />
    </div>
  );
}
function Line({ p, c, children }) {
  return (
    <div style={{ display:'flex', gap:'10px', marginBottom:'3px', fontSize:'13px', fontFamily:'var(--font-mono)' }}>
      <span style={{ color:'var(--comment)', minWidth:'40px', flexShrink:0 }}>{p}</span>
      <span style={{ color:c }}>{children}</span>
    </div>
  );
}
function Blank() { return <div style={{ height:'10px' }} />; }

const s = {
  mobileBanner: { background:'var(--surface-dark)', padding:'16px 20px 12px', borderBottom:'1px solid var(--border-dark)', flexShrink:0 },
  bannerTop:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' },
  bannerLogo:   { fontFamily:'var(--font-display)', fontSize:'18px', color:'#F8F8F8', letterSpacing:'1px' },
  bannerTag:    { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)' },
  bannerDomains:{ display:'flex', gap:'6px', flexWrap:'wrap' },
  pill:         { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--gold)', background:'rgba(201,147,42,0.1)', border:'1px solid rgba(201,147,42,0.25)', padding:'2px 8px' },

  terminal:     { flex:1, background:'var(--surface-dark)', display:'flex', flexDirection:'column', minWidth:0, position:'relative', overflow:'hidden' },
  termBar:      { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 16px', background:'var(--surface-dark2)', borderBottom:'1px solid var(--border-dark)', flexShrink:0 },
  termTitle:    { fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'2px' },
  termConn:     { fontFamily:'var(--font-display)', fontSize:'10px', color:'var(--green)', border:'1px solid var(--green)', padding:'1px 8px', letterSpacing:'1px' },
  termBody:     { padding:'24px 28px', flex:1, overflowY:'auto' },
  indent:       { paddingLeft:'52px', fontSize:'13px', marginBottom:'3px', fontFamily:'var(--font-mono)' },
  termBgLabel:  { fontFamily:'var(--font-display)', fontSize:'clamp(60px,10vw,100px)', lineHeight:0.9, color:'rgba(58,255,110,0.04)', position:'absolute', bottom:'-10px', right:'-10px', letterSpacing:'-4px', userSelect:'none', pointerEvents:'none' },

  formSide:     { background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(20px,4vw,40px) clamp(16px,4vw,36px)', flexShrink:0 },
  modeTabs:     { display:'flex', marginBottom:'20px', borderBottom:'2px solid var(--border)' },
  modeTab:      { flex:1, padding:'8px 10px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px', cursor:'pointer', textAlign:'left', marginBottom:'-2px', transition:'all 0.1s' },
  modeTabActive:{ color:'var(--blue)', borderBottomColor:'var(--blue)' },
  error:        { padding:'8px 12px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)' },
};

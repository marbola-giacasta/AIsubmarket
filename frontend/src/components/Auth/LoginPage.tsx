// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// LoginPage.tsx
// Desktop: dark terminal on the left, login form on the right.
// Mobile:  compact dark banner on top, login form below.
//          This way the brand/style is visible on mobile too.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import Btn from '../UI/Btn';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function LoginPage() {
  const { loginUser } = useAuth();
  const isMobile = useIsMobile(640);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display:'flex', minHeight:'100dvh', flexDirection: isMobile ? 'column' : 'row' }}>

      {/* Dark panel — left on desktop, compact banner on mobile */}
      {isMobile ? (
        // Mobile: compact dark header strip with branding
        <div style={s.mobileBanner}>
          <div style={s.bannerInner}>
            <span style={s.bannerLogo}># <span style={{ color:'var(--green)' }}>Sub</span>Market</span>
            <span style={s.bannerTag}>// AI subdomain registry</span>
          </div>
          <div style={s.bannerDomains}>
            {['open-ai.ch','open-ai.live','geminai.info','course-ai.co.uk'].map(d => (
              <span key={d} style={s.domainPill}>{d}</span>
            ))}
          </div>
        </div>
      ) : (
        // Desktop: full dark terminal panel
        <div style={s.terminal}>
          <div style={s.termBar}>
            <span style={s.termTitle}>TERMINAL</span>
            <span style={s.termConn}>CONNECTED</span>
          </div>
          <div style={s.termBody}>
            <Line p="$" c="#E8E8E8">whois submarket</Line>
            <Line p=">" c="var(--comment)">AI subdomain registry</Line>
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

      {/* Login form */}
      <div style={{
        ...s.formSide,
        borderLeft: isMobile ? 'none' : '2px solid var(--green)',
        borderTop:  isMobile ? '2px solid var(--green)' : 'none',
        width:      isMobile ? '100%' : 'clamp(300px, 40vw, 440px)',
        padding:    isMobile ? '28px 20px' : 'clamp(24px,5vw,40px) clamp(20px,4vw,36px)',
      }}>
        <div className="fade-up" style={{ width:'100%', maxWidth:'380px' }}>
          {!isMobile && (
            <div style={s.formHeader}>
              <span style={s.formTitle}># SubMarket</span>
              <span style={s.formComment}>// AI subdomain registry</span>
            </div>
          )}

          <div style={s.modeTabs}>
            <button style={{ ...s.modeTab, ...(mode==='login'    ? s.modeTabActive : {}) }} onClick={() => setMode('login')}>login.js</button>
            <button style={{ ...s.modeTab, ...(mode==='register' ? s.modeTabActive : {}) }} onClick={() => setMode('register')}>register.js</button>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <Field label="email"    type="email"    value={email} onChange={e => setEmail(e.target.value)} placeholder='"you@example.com"' />
            <Field label="password" type="password" value={pass}  onChange={e => setPass(e.target.value)}  placeholder={mode==='register' ? '"min 8 chars"' : '"........"'} />
            {error && <div style={s.error}>ERR: {error}</div>}
            <Btn type="submit" variant="primary" disabled={loading} style={{ width:'100%', justifyContent:'center', marginTop:'4px' }}>
              {loading ? '// loading...' : mode==='login' ? '> authenticate()' : '> createAccount()'}
            </Btn>
          </form>

          <p style={s.switchLine}>
            <span style={{ color:'var(--muted)' }}>// </span>
            <button style={s.switchBtn} onClick={() => setMode(mode==='login' ? 'register' : 'login')}>
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
    <div style={s.field}>
      <span style={s.fieldKey}><span style={{ color:'var(--blue)' }}>const </span>{label}</span>
      <span style={s.fieldEq}>=</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required style={s.fieldInput} />
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
  // Mobile banner
  mobileBanner: { background:'var(--surface-dark)', padding:'18px 20px 14px', borderBottom:'1px solid var(--border-dark)', flexShrink:0 },
  bannerInner:  { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' },
  bannerLogo:   { fontFamily:'var(--font-display)', fontSize:'18px', color:'#F8F8F8', letterSpacing:'1px' },
  bannerTag:    { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)' },
  bannerDomains:{ display:'flex', gap:'6px', flexWrap:'wrap' },
  domainPill:   { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--gold)', background:'rgba(201,147,42,0.1)', border:'1px solid rgba(201,147,42,0.25)', padding:'2px 8px' },

  // Desktop terminal
  terminal: { flex:1, background:'var(--surface-dark)', display:'flex', flexDirection:'column', minWidth:0, position:'relative', overflow:'hidden' },
  termBar: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 16px', background:'var(--surface-dark2)', borderBottom:'1px solid var(--border-dark)', flexShrink:0 },
  termTitle: { fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'2px' },
  termConn: { fontFamily:'var(--font-display)', fontSize:'10px', color:'var(--green)', border:'1px solid var(--green)', padding:'1px 8px', letterSpacing:'1px' },
  termBody: { padding:'24px 28px', flex:1, overflowY:'auto' },
  indent: { paddingLeft:'52px', fontSize:'13px', marginBottom:'3px', fontFamily:'var(--font-mono)' },
  termBgLabel: { fontFamily:'var(--font-display)', fontSize:'clamp(60px,10vw,100px)', lineHeight:0.9, color:'rgba(58,255,110,0.04)', position:'absolute', bottom:'-10px', right:'-10px', letterSpacing:'-4px', userSelect:'none', pointerEvents:'none' },

  // Form side
  formSide: { background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  formHeader: { marginBottom:'24px' },
  formTitle: { fontFamily:'var(--font-display)', fontSize:'20px', color:'var(--text)', display:'block', marginBottom:'4px', letterSpacing:'1px' },
  formComment: { fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' },

  modeTabs: { display:'flex', marginBottom:'20px', borderBottom:'2px solid var(--border)' },
  modeTab: { flex:1, padding:'8px 10px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px', cursor:'pointer', textAlign:'left', marginBottom:'-2px', transition:'all 0.1s' },
  modeTabActive: { color:'var(--blue)', borderBottomColor:'var(--blue)' },

  form: { display:'flex', flexDirection:'column', gap:'10px' },
  field: { display:'flex', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)' },
  fieldKey: { padding:'10px 10px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--gold)', borderRight:'1px solid var(--border)', minWidth:'130px', whiteSpace:'nowrap', flexShrink:0 },
  fieldEq: { padding:'0 8px', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px', flexShrink:0 },
  fieldInput: { flex:1, padding:'10px 6px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'16px', outline:'none', minWidth:0 },

  error: { padding:'8px 12px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)' },
  switchLine: { marginTop:'16px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)' },
  switchBtn: { background:'none', border:'none', color:'var(--teal)', fontFamily:'var(--font-mono)', fontSize:'12px', cursor:'pointer', textDecoration:'underline' },
};

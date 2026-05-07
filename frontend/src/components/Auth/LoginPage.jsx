import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import Btn from '../UI/Btn';

export default function LoginPage() {
  const { loginUser } = useAuth();
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
    <div style={s.page}>
      {/* Left dark terminal */}
      <div style={s.terminal}>
        <div style={s.termBar}>
          <span style={s.termTitle}>TERMINAL</span>
          <span style={s.termConnected}>CONNECTED</span>
        </div>
        <div style={s.termBody}>
          <Line p="$" color="#E8E8E8">whois submarket</Line>
          <Line p=">" color="var(--comment)">AI subdomain registry</Line>
          <Blank />
          <Line p="const" color="var(--blue)"> domains = [</Line>
          {['open-ai.ch','open-ai.live','geminai.info','course-ai.co.uk'].map(d => (
            <div key={d} style={s.indent}>
              <span style={{ color:'var(--gold)' }}>"{d}"</span>
              <span style={{ color:'var(--muted)' }}>,</span>
            </div>
          ))}
          <Line p="" color="var(--blue)">]</Line>
          <Blank />
          <Line p=">" color="var(--teal)">subdomain.configure(dns)</Line>
          <Line p=">" color="var(--teal)">cloudflare.propagate()</Line>
          <Line p=">" color="var(--comment)">website.goLive() -- OK</Line>
          <Blank />
          <div style={{ fontSize:'13px' }}>
            <span style={{ color:'var(--muted)' }}>$ </span>
            <span className="cursor" />
          </div>
        </div>
        {/* Big marker label bottom */}
        <div style={s.termLabel}>SUB<br />MARKET</div>
      </div>

      {/* Right form */}
      <div style={s.formSide}>
        <div className="fade-up" style={s.formWrap}>
          <div style={s.formHeader}>
            <span style={s.formTitle}># SubMarket</span>
            <span style={s.formComment}>// AI subdomain registry</span>
          </div>

          <div style={s.modeTabs}>
            <button style={{ ...s.modeTab, ...(mode==='login'    ? s.modeTabActive : {}) }} onClick={() => setMode('login')}>login.js</button>
            <button style={{ ...s.modeTab, ...(mode==='register' ? s.modeTabActive : {}) }} onClick={() => setMode('register')}>register.js</button>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <Field label="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder='"you@example.com"' />
            <Field label="password" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder={mode==='register' ? '"min 8 chars"' : '"........"'} />

            {error && <div style={s.error}>ERR: {error}</div>}

            <Btn type="submit" variant="primary" disabled={loading} style={{ width:'100%', justifyContent:'center', marginTop:'6px' }}>
              {loading ? '// loading...' : mode==='login' ? '&#8594; authenticate()' : '&#8594; createAccount()'}
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
      <span style={s.fieldKey}><span style={{ color:'var(--blue)' }}>const</span> {label}</span>
      <span style={s.fieldEq}>=</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required style={s.fieldInput} />
    </div>
  );
}
function Line({ p, color, children }) {
  return (
    <div style={{ display:'flex', gap:'10px', marginBottom:'3px', fontSize:'13px', fontFamily:'var(--font-mono)' }}>
      <span style={{ color:'var(--comment)', minWidth:'40px', flexShrink:0 }}>{p}</span>
      <span style={{ color }}>{children}</span>
    </div>
  );
}
function Blank() { return <div style={{ height:'10px' }} />; }

const s = {
  page: { display:'flex', minHeight:'100vh' },

  terminal: { flex:1, background:'var(--surface-dark)', display:'flex', flexDirection:'column', minWidth:0, position:'relative', overflow:'hidden' },
  termBar: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 16px', background:'var(--surface-dark2)', borderBottom:'1px solid var(--border-dark)' },
  termTitle: { fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'2px' },
  termConnected: { fontFamily:'var(--font-display)', fontSize:'10px', color:'var(--green)', border:'1px solid var(--green)', padding:'1px 8px', letterSpacing:'1px' },
  termBody: { padding:'28px 32px', flex:1, overflowY:'auto' },
  indent: { paddingLeft:'52px', fontSize:'13px', marginBottom:'3px', fontFamily:'var(--font-mono)' },
  termLabel: { fontFamily:'var(--font-display)', fontSize:'100px', lineHeight:0.9, color:'rgba(58,255,110,0.05)', position:'absolute', bottom:'-10px', right:'-10px', letterSpacing:'-4px', userSelect:'none', pointerEvents:'none' },

  formSide: { width:'440px', background:'var(--surface)', borderLeft:'2px solid var(--green)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 36px', flexShrink:0 },
  formWrap: { width:'100%' },
  formHeader: { marginBottom:'28px' },
  formTitle: { fontFamily:'var(--font-display)', fontSize:'20px', color:'var(--text)', display:'block', marginBottom:'4px', letterSpacing:'1px' },
  formComment: { fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' },

  modeTabs: { display:'flex', gap:'0', marginBottom:'22px', borderBottom:'2px solid var(--border)' },
  modeTab: { flex:1, padding:'8px 12px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px', cursor:'pointer', textAlign:'left', marginBottom:'-2px', transition:'all 0.1s' },
  modeTabActive: { color:'var(--blue)', borderBottomColor:'var(--blue)' },

  form: { display:'flex', flexDirection:'column', gap:'10px' },
  field: { display:'flex', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)' },
  fieldKey: { padding:'9px 12px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--gold)', borderRight:'1px solid var(--border)', minWidth:'150px', whiteSpace:'nowrap' },
  fieldEq: { padding:'0 10px', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px' },
  fieldInput: { flex:1, padding:'9px 8px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'12px', outline:'none' },

  error: { padding:'8px 12px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)' },
  switchLine: { marginTop:'18px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)' },
  switchBtn: { background:'none', border:'none', color:'var(--teal)', fontFamily:'var(--font-mono)', fontSize:'12px', cursor:'pointer', textDecoration:'underline' },
};

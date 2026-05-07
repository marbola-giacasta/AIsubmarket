import React, { useState } from 'react';
import * as api from '../../services/api';
import Btn from '../UI/Btn';

const USE_CASES = [
  'Personal portfolio / resume',
  'Business landing page',
  'Blog or newsletter',
  'E-commerce store',
  'Course or educational content',
  'AI / tech project',
  'Other',
];

export default function RequestFormModal({ subdomain, domain, fqdn, onClose, onSuccess }) {
  const [name,    setName]    = useState('');
  const [useCase, setUseCase] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await api.submitRequest({ subdomain, domain, name, useCase, message }); onSuccess(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.panel} className="fade-up">
        <div style={s.titleBar}>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' }}>// submit_request(</span>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--gold)', fontSize:'12px' }}>"{fqdn}"</span>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' }}>)</span>
          <button onClick={onClose} style={s.closeBtn}>[ close ]</button>
        </div>
        <div style={s.note}>
          <span style={{ color:'var(--comment)' }}>/* fill in details -- we review -- reply within 24h -- no payment now */</span>
        </div>
        <form onSubmit={handleSubmit} style={s.form}>
          <Field label="your_name"  type="text"   value={name}    onChange={e => setName(e.target.value)}    placeholder='"Mario Rossi"' required />
          <div style={s.field}>
            <span style={s.key}>use_case</span>
            <span style={s.eq}>=</span>
            <select value={useCase} onChange={e => setUseCase(e.target.value)} required style={s.select}>
              <option value="">// select...</option>
              {USE_CASES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ ...s.field, alignItems:'flex-start' }}>
            <span style={{ ...s.key, paddingTop:'2px' }}>message</span>
            <span style={s.eq}>=</span>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder='"Optional -- tell us about your project"'
              rows={3} style={{ ...s.input, resize:'vertical', lineHeight:1.5 }} />
          </div>
          {error && <div style={s.error}>ERR: {error}</div>}
          <div style={s.actions}>
            <Btn variant="ghost" type="button" onClick={onClose}>CANCEL</Btn>
            <Btn variant="primary" type="submit" disabled={loading}>
              {loading ? '// submitting...' : '&#9658; SUBMIT REQUEST'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, required }) {
  return (
    <div style={s.field}>
      <span style={s.key}>{label}</span>
      <span style={s.eq}>=</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} style={s.input} />
    </div>
  );
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'20px' },
  panel: { background:'var(--surface)', borderTop:'3px solid var(--green)', border:'1px solid var(--border-dark)', width:'100%', maxWidth:'500px', boxShadow:'6px 6px 0 rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' },
  titleBar: { display:'flex', alignItems:'center', gap:'4px', padding:'12px 16px', background:'var(--surface-dark2)', borderBottom:'1px solid var(--border-dark)' },
  closeBtn: { marginLeft:'auto', background:'none', border:'none', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'11px', cursor:'pointer' },
  note: { padding:'10px 16px', background:'rgba(74,124,63,0.07)', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)' },
  form: { padding:'16px', display:'flex', flexDirection:'column', gap:'10px' },
  field: { display:'flex', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)' },
  key: { fontFamily:'var(--font-display)', fontSize:'12px', color:'var(--gold)', padding:'9px 12px', borderRight:'1px solid var(--border)', minWidth:'110px', letterSpacing:'0.3px' },
  eq: { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 10px', fontSize:'12px' },
  input: { flex:1, background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'12px', outline:'none', padding:'9px 8px', minWidth:0 },
  select: { flex:1, background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'12px', outline:'none', padding:'9px 8px', cursor:'pointer' },
  error: { padding:'8px 12px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)' },
  actions: { display:'flex', gap:'8px', justifyContent:'flex-end', borderTop:'1px solid var(--border)', paddingTop:'12px' },
};

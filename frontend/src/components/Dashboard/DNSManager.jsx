import React, { useState } from 'react';
import * as api from '../../services/api';
import Btn from '../UI/Btn';

const DNS_TYPES = ['A', 'CNAME', 'MX', 'TXT', 'AAAA'];
const PROVIDERS = [
  { key:'vercel',      label:'VERCEL',       type:'CNAME', hint:'your-project.vercel.app' },
  { key:'netlify',     label:'NETLIFY',      type:'CNAME', hint:'your-site.netlify.app' },
  { key:'github',      label:'GITHUB PAGES', type:'CNAME', hint:'username.github.io' },
  { key:'wix',         label:'WIX',          type:'CNAME', hint:'your-site.wixsite.com' },
  { key:'squarespace', label:'SQUARESPACE',  type:'CNAME', hint:'ext.squarespace.com' },
  { key:'wordpress',   label:'WORDPRESS',    type:'CNAME', hint:'yoursite.wordpress.com' },
  { key:'vps',         label:'VPS / SERVER', type:'A',     hint:'123.45.67.89' },
];

export default function DNSManager({ tag, onClose, onSaved }) {
  const existing   = !!tag.dns_type;
  const [dnsType,  setDnsType]  = useState(tag.dns_type  || 'CNAME');
  const [dnsValue, setDnsValue] = useState(tag.dns_value || '');
  const [proxied,  setProxied]  = useState(!!tag.dns_proxied);
  const [ttl,      setTtl]      = useState(tag.dns_ttl   || 3600);
  const [provider, setProvider] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  function applyProvider(p) { setProvider(p.key); setDnsType(p.type); setDnsValue(''); }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try { await api.updateDns(tag.id, { dns_type:dnsType, dns_value:dnsValue.trim(), dns_proxied:proxied, dns_ttl:Number(ttl) }); onSaved(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Remove DNS for ${tag.fqdn}?`)) return;
    setSaving(true);
    try { await api.deleteDns(tag.id); onSaved(); }
    catch (err) { setError(err.message); setSaving(false); }
  }

  const activeP = PROVIDERS.find(p => p.key === provider);

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.panel} className="fade-up">
        <div style={s.titleBar}>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' }}>// dns_config.edit(</span>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--gold)', fontSize:'12px' }}>"{tag.fqdn}"</span>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' }}>)</span>
          <button onClick={onClose} style={s.closeBtn}>[ close ]</button>
        </div>

        <div style={s.presets}>
          <div style={s.presetsLabel}>// QUICK PRESET &#9658; SELECT HOSTING PROVIDER</div>
          <div style={s.presetGrid}>
            {PROVIDERS.map(p => (
              <button key={p.key} type="button" onClick={() => applyProvider(p)}
                style={{ ...s.presetBtn, ...(provider===p.key ? s.presetActive : {}) }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {activeP && (
          <div style={s.hint}>
            <span style={{ color:'var(--comment)' }}>/* </span>
            enter {activeP.type === 'CNAME' ? 'CNAME target' : 'IP address'} --
            e.g. <span style={{ color:'var(--gold)' }}>"{activeP.hint}"</span>
            <span style={{ color:'var(--comment)' }}> */</span>
          </div>
        )}

        <form onSubmit={handleSave} style={s.form}>
          <div style={s.field}>
            <span style={s.key}>dns_type</span>
            <span style={s.eq}>=</span>
            <select value={dnsType} onChange={e => setDnsType(e.target.value)} style={s.select}>
              {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <span style={s.key}>dns_value</span>
            <span style={s.eq}>=</span>
            <input value={dnsValue} onChange={e => setDnsValue(e.target.value)}
              placeholder={`"${activeP?.hint || (dnsType==='A' ? '1.2.3.4' : 'target.example.com')}"`}
              required style={s.input} />
          </div>

          <div style={s.twoCol}>
            <div style={s.field}>
              <span style={s.key}>ttl</span>
              <span style={s.eq}>=</span>
              <input type="number" value={ttl} onChange={e => setTtl(e.target.value)} min="60" max="86400" disabled={proxied} style={{ ...s.input, width:'80px' }} />
            </div>
            <div style={{ ...s.field, cursor:'pointer', flex:1 }} onClick={() => setProxied(!proxied)}>
              <span style={s.key}>cf_proxy</span>
              <span style={s.eq}>=</span>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'12px', color: proxied ? 'var(--green)' : 'var(--muted)', letterSpacing:'0.5px' }}>
                {proxied ? 'TRUE' : 'FALSE'}
              </span>
              <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'10px', marginLeft:'8px' }}>[toggle]</span>
            </div>
          </div>

          {error && <div style={s.error}>ERR: {error}</div>}

          <div style={s.actions}>
            {existing && <Btn variant="danger" type="button" onClick={handleDelete} disabled={saving}>DELETE RECORD</Btn>}
            <Btn variant="blue" type="submit" disabled={saving}>
              {saving ? '// saving...' : existing ? 'UPDATE DNS' : 'CREATE DNS RECORD'}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'20px' },
  panel: { background:'var(--surface)', borderTop:'3px solid var(--green)', border:'1px solid var(--border-dark)', width:'100%', maxWidth:'560px', maxHeight:'90vh', overflowY:'auto', boxShadow:'6px 6px 0 rgba(0,0,0,0.2)' },
  titleBar: { display:'flex', alignItems:'center', gap:'4px', padding:'12px 16px', background:'var(--surface-dark2)', borderBottom:'1px solid var(--border-dark)' },
  closeBtn: { marginLeft:'auto', background:'none', border:'none', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'11px', cursor:'pointer' },
  presets: { padding:'14px 16px 10px' },
  presetsLabel: { fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px', marginBottom:'10px' },
  presetGrid: { display:'flex', flexWrap:'wrap', gap:'4px' },
  presetBtn: { fontFamily:'var(--font-display)', padding:'4px 10px', background:'var(--bg)', border:'1px solid var(--border)', color:'var(--muted)', fontSize:'10px', cursor:'pointer', letterSpacing:'0.5px', transition:'all 0.1s' },
  presetActive: { background:'var(--blue)', border:'1px solid var(--blue)', color:'#F8F8F8' },
  hint: { padding:'8px 16px', background:'rgba(201,147,42,0.06)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)' },
  form: { padding:'16px', display:'flex', flexDirection:'column', gap:'10px' },
  twoCol: { display:'flex', gap:'8px', flexWrap:'wrap' },
  field: { display:'flex', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)', flex:1 },
  key: { fontFamily:'var(--font-display)', fontSize:'12px', color:'var(--gold)', padding:'9px 12px', borderRight:'1px solid var(--border)', minWidth:'90px', letterSpacing:'0.3px', whiteSpace:'nowrap' },
  eq: { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', fontSize:'12px' },
  input: { flex:1, background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'12px', outline:'none', padding:'9px 8px', minWidth:0 },
  select: { flex:1, background:'transparent', border:'none', fontFamily:'var(--font-display)', color:'var(--orange)', fontSize:'12px', outline:'none', padding:'9px 8px', letterSpacing:'0.5px' },
  error: { padding:'8px 12px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)' },
  actions: { display:'flex', gap:'8px', justifyContent:'flex-end', borderTop:'1px solid var(--border)', paddingTop:'12px' },
};

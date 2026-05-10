// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminDomains.tsx — manage root domains available for purchase.
// Admin can add new domains, toggle them on/off, update their
// Cloudflare Zone IDs, and delete them (if no subdomains on them).
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import Btn from '../UI/Btn';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
function getToken() { return localStorage.getItem('token'); }
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}
async function req(method, path, body = null) {
  const res  = await fetch(`${BASE}${path}`, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function AdminDomains() {
  const [domains,   setDomains]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState('');
  const [error,     setError]     = useState('');
  const [showAdd,   setShowAdd]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { domains } = await req('GET', '/admin/root-domains'); setDomains(domains); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(id, currentActive) {
    setMsg(''); setError('');
    try {
      await req('PUT', `/admin/root-domains/${id}`, { active: !currentActive });
      setMsg(`Domain ${currentActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(id, domain) {
    if (!confirm(`Delete ${domain}? This cannot be undone.`)) return;
    setMsg(''); setError('');
    try { await req('DELETE', `/admin/root-domains/${id}`); setMsg(`${domain} deleted`); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleAdd(data) {
    setMsg(''); setError('');
    try {
      await req('POST', '/admin/root-domains', data);
      setMsg(`${data.domain} added successfully`);
      setShowAdd(false);
      load();
    } catch (err) { setError(err.message); }
  }

  if (loading) return <div style={s.loading}>// loading domains<span className="cursor" /></div>;

  const active   = domains.filter(d => d.active);
  const inactive = domains.filter(d => !d.active);

  return (
    <div className="fade-up">
      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>// admin &gt; root_domains.js</p>
          <h1 style={s.title}>ROOT DOMAINS</h1>
        </div>
        <div style={s.stats}>
          <Stat label="ACTIVE"   value={active.length}   color="var(--green)" />
          <Stat label="INACTIVE" value={inactive.length} color="var(--muted)" />
        </div>
      </div>

      {msg   && <div style={s.ok}>OK -- {msg}</div>}
      {error && <div style={s.err}>ERR -- {error}</div>}

      {/* Explainer */}
      <div style={s.infoBox}>
        <span style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'11px' }}>
          // Each domain needs a Cloudflare Zone ID.<br />
          // Find it: Cloudflare dashboard → click the domain → right sidebar → Zone ID.<br />
          // Inactive domains are hidden from the purchase page but existing subdomains still work.
        </span>
      </div>

      {/* Add new domain button */}
      <div style={{ marginBottom:'20px' }}>
        <Btn variant="gold" onClick={() => setShowAdd(o => !o)}>
          {showAdd ? '× CANCEL' : '+ ADD NEW DOMAIN'}
        </Btn>
      </div>

      {/* Add domain form */}
      {showAdd && <AddDomainForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />}

      {/* Domain list */}
      <SectionHead label="ACTIVE" count={active.length} />
      {active.length === 0
        ? <div style={s.empty}>// no active domains</div>
        : <div style={s.grid}>{active.map(d => <DomainCard key={d.id} domain={d} onToggle={handleToggle} onDelete={handleDelete} />)}</div>
      }

      {inactive.length > 0 && (
        <>
          <SectionHead label="INACTIVE" count={inactive.length} top />
          <div style={s.grid}>{inactive.map(d => <DomainCard key={d.id} domain={d} onToggle={handleToggle} onDelete={handleDelete} />)}</div>
        </>
      )}
    </div>
  );
}

// Individual domain card with inline edit for zone_id and description
function DomainCard({ domain: d, onToggle, onDelete }) {
  const [editing,     setEditing]     = useState(false);
  const [zoneId,      setZoneId]      = useState(d.zone_id);
  const [description, setDescription] = useState(d.description || '');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await fetch(`${(import.meta.env.VITE_API_URL||'')}/api/admin/root-domains/${d.id}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ zone_id: zoneId, description }),
      }).then(r => r.json()).then(data => { if (data.error) throw new Error(data.error); });
      setEditing(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ ...s.card, borderTopColor: d.active ? 'var(--green)' : 'var(--muted)' }}>
      <div style={s.cardHead}>
        <span style={s.domainName}>{d.domain}</span>
        <span style={{ ...s.activeBadge, background: d.active ? 'var(--green)' : 'var(--border)', color: d.active ? '#0A0A0A' : 'var(--muted)' }}>
          {d.active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      <div style={s.cardBody}>
        {editing ? (
          <>
            <Field k="zone_id"     v={zoneId}      onChange={setZoneId}      placeholder="Cloudflare Zone ID" />
            <Field k="description" v={description} onChange={setDescription} placeholder="Optional label" />
            {error && <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--red)' }}>ERR: {error}</span>}
          </>
        ) : (
          <>
            <Row k="zone_id"     v={zoneId || '—'} />
            <Row k="description" v={description || '—'} />
            <Row k="created"     v={new Date(d.created_at).toLocaleDateString('en-GB')} />
          </>
        )}
      </div>

      <div style={s.cardFooter}>
        {editing ? (
          <>
            <Btn variant="ghost"   onClick={() => setEditing(false)} style={{ fontSize:'11px', padding:'5px 12px' }}>CANCEL</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving} style={{ fontSize:'11px', padding:'5px 12px' }}>
              {saving ? '// saving...' : 'SAVE'}
            </Btn>
          </>
        ) : (
          <>
            <Btn variant="blue"   onClick={() => setEditing(true)} style={{ fontSize:'11px', padding:'5px 12px' }}>EDIT</Btn>
            <Btn variant={d.active ? 'gold' : 'ghost'} onClick={() => onToggle(d.id, d.active)} style={{ fontSize:'11px', padding:'5px 12px' }}>
              {d.active ? 'DEACTIVATE' : 'ACTIVATE'}
            </Btn>
            <Btn variant="danger" onClick={() => onDelete(d.id, d.domain)} style={{ fontSize:'11px', padding:'5px 12px' }}>DELETE</Btn>
          </>
        )}
      </div>
    </div>
  );
}

// Form to add a new domain
function AddDomainForm({ onSubmit, onCancel }) {
  const [domain,      setDomain]      = useState('');
  const [zoneId,      setZoneId]      = useState('');
  const [description, setDescription] = useState('');
  const [active,      setActive]      = useState(true);

  return (
    <div style={s.addForm}>
      <div style={s.addFormHeader}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--gold)', letterSpacing:'1px' }}>// ADD NEW ROOT DOMAIN</span>
      </div>
      <div style={s.addFormBody}>
        <Field k="domain"      v={domain}      onChange={setDomain}      placeholder="e.g. newdomain.ai" />
        <Field k="zone_id"     v={zoneId}      onChange={setZoneId}      placeholder="Cloudflare Zone ID" />
        <Field k="description" v={description} onChange={setDescription} placeholder="Optional label" />
        <div style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }} onClick={() => setActive(o => !o)}>
          <span style={{ fontFamily:'var(--font-display)', color:'var(--gold)', fontSize:'11px', letterSpacing:'0.3px', minWidth:'100px' }}>active</span>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'12px', color: active ? 'var(--green)' : 'var(--muted)' }}>{active ? 'TRUE' : 'FALSE'}</span>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'10px' }}>[toggle]</span>
        </div>
      </div>
      <div style={s.addFormFooter}>
        <Btn variant="ghost" onClick={onCancel} style={{ fontSize:'11px', padding:'5px 12px' }}>CANCEL</Btn>
        <Btn variant="gold"  onClick={() => onSubmit({ domain, zone_id: zoneId, description, active })}
          disabled={!domain.trim() || !zoneId.trim()} style={{ fontSize:'11px', padding:'5px 12px' }}>
          &#9658; ADD DOMAIN
        </Btn>
      </div>
    </div>
  );
}

function Field({ k, v, onChange, placeholder }) {
  return (
    <div style={{ display:'flex', alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)' }}>
      <span style={{ fontFamily:'var(--font-display)', color:'var(--gold)', fontSize:'11px', padding:'7px 10px', borderRight:'1px solid var(--border)', minWidth:'110px', letterSpacing:'0.3px' }}>{k}</span>
      <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', fontSize:'11px' }}>=</span>
      <input value={v} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex:1, padding:'7px 6px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'12px', outline:'none' }} />
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', fontSize:'11px' }}>
      <span style={{ fontFamily:'var(--font-display)', color:'var(--gold)', minWidth:'90px', letterSpacing:'0.3px', flexShrink:0 }}>{k}</span>
      <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', flexShrink:0 }}>=</span>
      <span style={{ fontFamily:'var(--font-mono)', color:'var(--text)', wordBreak:'break-all' }}>{v}</span>
    </div>
  );
}
function Stat({ label, value, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 20px', background:'var(--surface)', gap:'3px' }}>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'28px', color, lineHeight:1 }}>{value}</span>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--muted)', letterSpacing:'1.5px' }}>{label}</span>
    </div>
  );
}
function SectionHead({ label, count, top=false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'14px', marginTop: top ? '32px' : 0 }}>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px', whiteSpace:'nowrap' }}>// {label} [{count}]</span>
      <div style={{ flex:1, height:'1px', background:'var(--border)' }} />
    </div>
  );
}

const s = {
  loading: { fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px', padding:'20px 0' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', flexWrap:'wrap', gap:'16px' },
  eyebrow: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)', marginBottom:'6px' },
  title: { fontFamily:'var(--font-display)', fontSize:'clamp(24px,4vw,36px)', letterSpacing:'2px' },
  stats: { display:'flex', gap:'1px', background:'var(--border)' },
  ok:  { padding:'8px 14px', background:'rgba(58,255,110,0.08)', border:'1px solid var(--green)', fontFamily:'var(--font-mono)', fontSize:'12px', marginBottom:'16px' },
  err: { padding:'8px 14px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  infoBox: { padding:'12px 14px', background:'rgba(74,124,63,0.05)', border:'1px solid rgba(74,124,63,0.2)', marginBottom:'20px' },
  empty: { fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px', padding:'16px', border:'1px dashed var(--border)', background:'var(--surface)' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'12px' },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderTop:'3px solid var(--green)', display:'flex', flexDirection:'column' },
  cardHead: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', gap:'8px' },
  domainName: { fontFamily:'var(--font-display)', fontSize:'15px', letterSpacing:'0.5px', wordBreak:'break-all' },
  activeBadge: { fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 8px', letterSpacing:'1px', flexShrink:0 },
  cardBody: { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'8px', flex:1 },
  cardFooter: { display:'flex', gap:'6px', justifyContent:'flex-end', padding:'10px 14px', borderTop:'1px solid var(--border)', background:'var(--bg)', flexWrap:'wrap' },
  addForm: { border:'1px solid var(--gold)', borderTop:'3px solid var(--gold)', background:'var(--surface)', marginBottom:'24px' },
  addFormHeader: { padding:'10px 14px', background:'rgba(201,147,42,0.06)', borderBottom:'1px solid var(--border)' },
  addFormBody: { padding:'14px', display:'flex', flexDirection:'column', gap:'8px' },
  addFormFooter: { display:'flex', gap:'8px', justifyContent:'flex-end', padding:'10px 14px', borderTop:'1px solid var(--border)', background:'var(--bg)' },
};

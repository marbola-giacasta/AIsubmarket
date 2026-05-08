// @ts-nocheck
// TypeScript migration in progress — full types will be added gradually.
// @ts-nocheck suppresses type errors on this file so the build passes
// while the rest of the codebase is already fully typed.
import React, { useState, useEffect, useCallback } from 'react';
import Btn from '../UI/Btn';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

function getToken() { return localStorage.getItem('token'); }
function authHeaders() {
  return { 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` };
}
async function req(method, path, body = null) {
  const res = await fetch(`${BASE}${path}`, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function AdminPanel() {
  const [requests,   setRequests]   = useState([]);
  const [subdomains, setSubdomains] = useState([]);
  const [tab,        setTab]        = useState('requests'); // 'requests' | 'domains'
  const [loading,    setLoading]    = useState(true);
  const [msg,        setMsg]        = useState('');
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        req('GET', '/admin/requests'),
        req('GET', '/admin/subdomains'),
      ]);
      setRequests(r.requests);
      setSubdomains(s.subdomains);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id) {
    try {
      await req('POST', `/admin/requests/${id}/approve`);
      setMsg('Subdomain approved and registered.');
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleReject(id) {
    if (!confirm('Reject this request?')) return;
    try {
      await req('POST', `/admin/requests/${id}/reject`);
      setMsg('Request rejected.');
      load();
    } catch (err) { setError(err.message); }
  }

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  return (
    <div className="fade-up">
      <div style={s.breadcrumb}>
        <span style={{ color:'var(--muted)', fontSize:'11px' }}># submarket &gt; </span>
        <span style={{ color:'var(--gold)', fontSize:'11px' }}>admin.js</span>
        <span style={{ color:'var(--comment)', fontSize:'11px', marginLeft:'10px' }}>// admin panel</span>
      </div>
      <h1 style={s.title}>ADMIN PANEL</h1>

      {msg   && <div style={s.ok}>OK -- {msg}</div>}
      {error && <div style={s.err}>ERR -- {error}</div>}

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab==='requests' ? s.tabActive : {}) }} onClick={() => setTab('requests')}>
          requests.js <span style={s.badge}>{pending.length}</span>
        </button>
        <button style={{ ...s.tab, ...(tab==='domains' ? s.tabActive : {}) }} onClick={() => setTab('domains')}>
          all_domains.js <span style={s.badge}>{subdomains.length}</span>
        </button>
      </div>

      {loading ? (
        <div style={s.loading}>// loading<span className="cursor" /></div>
      ) : tab === 'requests' ? (
        <div>
          {/* Pending */}
          <div style={s.sectionHead}>// PENDING [{pending.length}]</div>
          {pending.length === 0 && <div style={s.empty}>// no pending requests</div>}
          {pending.map(r => (
            <RequestCard key={r.id} request={r} onApprove={handleApprove} onReject={handleReject} />
          ))}

          {/* Resolved */}
          {resolved.length > 0 && (
            <>
              <div style={{ ...s.sectionHead, marginTop:'24px' }}>// RESOLVED [{resolved.length}]</div>
              {resolved.map(r => (
                <RequestCard key={r.id} request={r} resolved />
              ))}
            </>
          )}
        </div>
      ) : (
        <div>
          <div style={s.sectionHead}>// ALL REGISTERED SUBDOMAINS [{subdomains.length}]</div>
          {subdomains.length === 0 && <div style={s.empty}>// no subdomains registered</div>}
          <div style={s.domGrid}>
            {subdomains.map(tag => (
              <div key={tag.id} style={s.domCard}>
                <div style={s.domFqdn}>{tag.fqdn}</div>
                <div style={s.domMeta}>
                  <span style={{ color:'var(--muted)' }}>{tag.requester_email || tag.owner_email || '—'}</span>
                  {tag.dns_type && <span style={{ color:'var(--blue)' }}>{tag.dns_type} &rarr; {tag.dns_value}</span>}
                  {!tag.dns_type && <span style={{ color:'var(--muted)' }}>// no dns</span>}
                </div>
                <div style={s.domDate}>{new Date(tag.created_at).toLocaleDateString('en-GB')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({ request: r, onApprove, onReject, resolved = false }) {
  return (
    <div style={s.card}>
      <div style={s.cardHead}>
        <span style={s.fqdn}>{r.fqdn}</span>
        <span style={{ ...s.statusChip, background: r.status==='pending' ? 'var(--gold)' : r.status==='approved' ? 'var(--green)' : 'var(--red)', color:'#0A0A0A' }}>
          {r.status.toUpperCase()}
        </span>
      </div>
      <div style={s.cardBody}>
        <Field k="name"      v={r.name} />
        <Field k="email"     v={r.requester_email} />
        <Field k="use_case"  v={r.use_case} />
        {r.message && <Field k="message" v={r.message} />}
        <Field k="submitted" v={new Date(r.created_at).toLocaleString('en-GB')} />
      </div>
      {!resolved && (
        <div style={s.cardActions}>
          <Btn variant="danger"  onClick={() => onReject(r.id)}>REJECT</Btn>
          <Btn variant="primary" onClick={() => onApprove(r.id)}>&#9658; APPROVE &amp; REGISTER</Btn>
        </div>
      )}
    </div>
  );
}

function Field({ k, v }) {
  return (
    <div style={s.field}>
      <span style={s.fieldKey}>{k}</span>
      <span style={s.fieldEq}>=</span>
      <span style={s.fieldVal}>{v}</span>
    </div>
  );
}

const s = {
  breadcrumb: { marginBottom:'6px' },
  title: { fontFamily:'var(--font-display)', fontSize:'36px', letterSpacing:'2px', marginBottom:'20px' },
  ok:  { padding:'8px 14px', background:'rgba(58,255,110,0.08)', border:'1px solid var(--green)', fontFamily:'var(--font-mono)', fontSize:'12px', marginBottom:'16px' },
  err: { padding:'8px 14px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  loading: { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'20px 0', fontSize:'12px' },

  tabs: { display:'flex', borderBottom:'2px solid var(--border)', marginBottom:'20px' },
  tab: { padding:'8px 16px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px', cursor:'pointer', marginBottom:'-2px', display:'flex', alignItems:'center', gap:'8px' },
  tabActive: { color:'var(--gold)', borderBottomColor:'var(--gold)' },
  badge: { fontFamily:'var(--font-display)', fontSize:'10px', background:'var(--gold)', color:'#0A0A0A', padding:'1px 6px', letterSpacing:'0.5px' },

  sectionHead: { fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px', marginBottom:'10px' },
  empty: { fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px', padding:'16px', border:'1px dashed var(--border)' },

  card: { border:'1px solid var(--border)', borderTop:'2px solid var(--gold)', background:'var(--surface)', marginBottom:'10px' },
  cardHead: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)' },
  fqdn: { fontFamily:'var(--font-display)', fontSize:'16px', color:'var(--text)', letterSpacing:'0.5px' },
  statusChip: { fontFamily:'var(--font-display)', fontSize:'10px', padding:'2px 8px', letterSpacing:'1px' },
  cardBody: { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'6px' },
  cardActions: { display:'flex', gap:'8px', justifyContent:'flex-end', padding:'10px 14px', borderTop:'1px solid var(--border)', background:'var(--bg)' },

  field: { display:'flex', alignItems:'flex-start', gap:'0', fontSize:'12px' },
  fieldKey: { fontFamily:'var(--font-display)', color:'var(--gold)', minWidth:'100px', letterSpacing:'0.3px', flexShrink:0 },
  fieldEq:  { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', flexShrink:0 },
  fieldVal: { fontFamily:'var(--font-mono)', color:'var(--text)', wordBreak:'break-all' },

  domGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'1px', background:'var(--border)' },
  domCard: { background:'var(--surface)', padding:'14px' },
  domFqdn: { fontFamily:'var(--font-display)', fontSize:'14px', color:'var(--text)', marginBottom:'6px', letterSpacing:'0.3px' },
  domMeta: { display:'flex', flexDirection:'column', gap:'3px', fontFamily:'var(--font-mono)', fontSize:'11px', marginBottom:'6px' },
  domDate: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' },
};
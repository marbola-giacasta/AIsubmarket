// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminRequests.tsx — admin view of all subdomain requests.
// When approving or rejecting, the admin can optionally type
// a note that the user will see on their dashboard.
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

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState('');
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { requests } = await req('GET', '/admin/requests'); setRequests(requests); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id, note) {
    setError(''); setMsg('');
    try {
      const { message } = await req('POST', `/admin/requests/${id}/approve`, { admin_note: note || null });
      setMsg(message);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleReject(id, note) {
    setError(''); setMsg('');
    try {
      await req('POST', `/admin/requests/${id}/reject`, { admin_note: note || null });
      setMsg('Request rejected.');
      load();
    } catch (err) { setError(err.message); }
  }

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  if (loading) return <div style={s.loading}>// loading requests<span className="cursor" /></div>;

  return (
    <div className="fade-up">
      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>// admin &gt; requests.js</p>
          <h1 style={s.title}>SUBDOMAIN REQUESTS</h1>
        </div>
        <div style={s.stats}>
          <Stat label="PENDING"  value={pending.length}  color="var(--gold)" />
          <Stat label="RESOLVED" value={resolved.length} color="var(--comment)" />
          <Stat label="TOTAL"    value={requests.length} color="var(--muted)" />
        </div>
      </div>

      {msg   && <div style={s.ok}>OK -- {msg}</div>}
      {error && <div style={s.err}>ERR -- {error}</div>}

      <SectionHead label="PENDING" count={pending.length} />
      {pending.length === 0 ? (
        <div style={s.empty}>// no pending requests — all clear</div>
      ) : (
        <div style={s.grid}>
          {pending.map(r => (
            <RequestCard key={r.id} request={r} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <SectionHead label="RESOLVED" count={resolved.length} top />
          <div style={s.grid}>
            {resolved.map(r => <RequestCard key={r.id} request={r} resolved />)}
          </div>
        </>
      )}
    </div>
  );
}

// Each request card with inline note field for admin
function RequestCard({ request: r, onApprove, onReject, resolved = false }) {
  // I keep the note in local state per card so admins can
  // type different notes for different requests independently
  const [note, setNote] = useState('');
  const statusColor = r.status === 'approved' ? 'var(--comment)' : r.status === 'rejected' ? 'var(--red)' : 'var(--gold)';

  return (
    <div style={{ ...s.card, borderTopColor: statusColor }}>
      <div style={s.cardHead}>
        <span style={s.fqdn}>{r.fqdn}</span>
        <span style={{ ...s.statusChip, background: statusColor, color: r.status === 'pending' ? '#0A0A0A' : '#F8F8F8' }}>
          {r.status.toUpperCase()}
        </span>
      </div>

      <div style={s.cardBody}>
        <Row k="name"      v={r.name} />
        <Row k="email"     v={r.requester_email} />
        <Row k="use_case"  v={r.use_case} />
        {r.message && <Row k="message" v={r.message} />}
        <Row k="submitted" v={new Date(r.created_at).toLocaleString('en-GB')} />

        {/* Show existing admin note on resolved cards */}
        {r.admin_note && (
          <div style={s.existingNote}>
            <span style={{ color:'var(--comment)', fontFamily:'var(--font-mono)', fontSize:'10px' }}>// admin note sent to user:</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.5 }}>{r.admin_note}</span>
          </div>
        )}
      </div>

      {/* Note field + action buttons — only on pending cards */}
      {!resolved && (
        <div style={s.actionArea}>
          <div style={s.noteField}>
            <span style={s.noteLabel}>// optional note to user:</span>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Approved! Configure your DNS to point to your hosting provider."
              rows={2}
              style={s.noteInput}
            />
          </div>
          <div style={s.buttons}>
            <Btn variant="danger"  onClick={() => onReject(r.id, note)}>REJECT</Btn>
            <Btn variant="primary" onClick={() => onApprove(r.id, note)}>&#9658; APPROVE &amp; REGISTER</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={s.row}>
      <span style={s.rowKey}>{k}</span>
      <span style={s.rowEq}>=</span>
      <span style={s.rowVal}>{v}</span>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={s.stat}>
      <span style={{ ...s.statValue, color }}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

function SectionHead({ label, count, top = false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'14px', marginTop: top ? '36px' : 0 }}>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px', whiteSpace:'nowrap' }}>
        // {label} [{count}]
      </span>
      <div style={{ flex:1, height:'1px', background:'var(--border)' }} />
    </div>
  );
}

const s = {
  loading: { fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px', padding:'20px 0' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px', flexWrap:'wrap', gap:'16px' },
  eyebrow: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)', marginBottom:'6px' },
  title: { fontFamily:'var(--font-display)', fontSize:'clamp(24px,4vw,36px)', letterSpacing:'2px' },
  stats: { display:'flex', gap:'1px', background:'var(--border)' },
  stat: { display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 20px', background:'var(--surface)', gap:'3px' },
  statValue: { fontFamily:'var(--font-display)', fontSize:'28px', lineHeight:1 },
  statLabel: { fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--muted)', letterSpacing:'1.5px' },
  ok:  { padding:'8px 14px', background:'rgba(74,124,63,0.08)', border:'1px solid var(--comment)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--comment)', marginBottom:'16px' },
  err: { padding:'8px 14px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  empty: { fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px', padding:'20px', border:'1px dashed var(--border)', background:'var(--surface)' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'12px' },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderTop:'3px solid var(--gold)', display:'flex', flexDirection:'column' },
  cardHead: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', gap:'8px' },
  fqdn: { fontFamily:'var(--font-display)', fontSize:'15px', letterSpacing:'0.3px', wordBreak:'break-all' },
  statusChip: { fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 8px', letterSpacing:'1.5px', flexShrink:0 },
  cardBody: { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'6px', flex:1 },
  row: { display:'flex', alignItems:'flex-start', fontSize:'12px' },
  rowKey: { fontFamily:'var(--font-display)', color:'var(--gold)', minWidth:'90px', fontSize:'11px', letterSpacing:'0.3px', flexShrink:0 },
  rowEq: { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', flexShrink:0 },
  rowVal: { fontFamily:'var(--font-mono)', color:'var(--text)', wordBreak:'break-all', fontSize:'12px' },
  existingNote: { display:'flex', flexDirection:'column', gap:'4px', padding:'8px 10px', background:'rgba(201,147,42,0.06)', border:'1px solid rgba(201,147,42,0.2)', marginTop:'4px' },

  // Note field and action buttons at the bottom of pending cards
  actionArea: { borderTop:'1px solid var(--border)', background:'var(--bg)' },
  noteField: { padding:'10px 14px', display:'flex', flexDirection:'column', gap:'5px' },
  noteLabel: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)' },
  noteInput: {
    padding:'8px 10px', background:'var(--surface)', border:'1px solid var(--border)',
    fontFamily:'var(--font-mono)', color:'var(--text)', fontSize:'12px',
    outline:'none', resize:'vertical', lineHeight:1.5,
  },
  buttons: { display:'flex', gap:'8px', justifyContent:'flex-end', padding:'0 14px 12px' },
};

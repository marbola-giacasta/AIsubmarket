// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminRequests.tsx — admin view with three action types:
//   1. COMMENT  — send a message without deciding yet
//   2. PROPOSE PRICE — send a monthly price proposal
//   3. APPROVE / REJECT — final decision with optional note
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

  async function handleComment(id, comment) {
    setError(''); setMsg('');
    try { await req('POST', `/admin/requests/${id}/comment`, { admin_comment: comment }); setMsg('Comment sent to user.'); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleProposePrice(id, prices, comment) {
    setError(''); setMsg('');
    try { await req('POST', `/admin/requests/${id}/propose-price`, { ...prices, admin_comment: comment }); setMsg('Price proposal sent to user.'); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleApprove(id, note) {
    setError(''); setMsg('');
    try { const { message } = await req('POST', `/admin/requests/${id}/approve`, { admin_note: note }); setMsg(message); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleReject(id, note) {
    setError(''); setMsg('');
    try { await req('POST', `/admin/requests/${id}/reject`, { admin_note: note }); setMsg('Request rejected.'); load(); }
    catch (err) { setError(err.message); }
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
      {pending.length === 0
        ? <div style={s.empty}>// no pending requests</div>
        : <div style={s.grid}>{pending.map(r => <RequestCard key={r.id} request={r} onComment={handleComment} onProposePrice={handleProposePrice} onApprove={handleApprove} onReject={handleReject} />)}</div>
      }

      {resolved.length > 0 && (
        <>
          <SectionHead label="RESOLVED" count={resolved.length} top />
          <div style={s.grid}>{resolved.map(r => <RequestCard key={r.id} request={r} resolved />)}</div>
        </>
      )}
    </div>
  );
}

function RequestCard({ request: r, onComment, onProposePrice, onApprove, onReject, resolved = false }) {
  const [tab,     setTab]     = useState('decide'); // 'comment' | 'price' | 'decide'
  const [note,    setNote]    = useState('');
  const [comment, setComment] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [priceChf, setPriceChf] = useState('');
  const [priceEur, setPriceEur] = useState('');
  const [priceNote, setPriceNote] = useState('');

  const statusColor = r.status === 'approved' ? 'var(--comment)' : r.status === 'rejected' ? 'var(--red)' : 'var(--gold)';

  // For price proposal badge
  const priceLabel = r.price_status === 'proposed' ? 'PRICE SENT' : r.price_status === 'accepted' ? 'PRICE ACCEPTED' : r.price_status === 'declined' ? 'PRICE DECLINED' : null;

  return (
    <div style={{ ...s.card, borderTopColor: statusColor }}>
      <div style={s.cardHead}>
        <span style={s.fqdn}>{r.fqdn}</span>
        <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
          {priceLabel && <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 8px', background:'rgba(26,92,255,0.15)', color:'var(--blue)', letterSpacing:'1px' }}>{priceLabel}</span>}
          <span style={{ ...s.statusChip, background: statusColor, color: r.status === 'pending' ? '#0A0A0A' : '#F8F8F8' }}>{r.status.toUpperCase()}</span>
        </div>
      </div>

      <div style={s.cardBody}>
        <Row k="name"      v={r.name} />
        <Row k="email"     v={r.requester_email} />
        <Row k="use_case"  v={r.use_case} />
        {r.message && <Row k="message" v={r.message} />}
        <Row k="submitted" v={new Date(r.created_at).toLocaleString('en-GB')} />

        {/* Existing comment */}
        {r.admin_comment && (
          <div style={s.existing}>
            <span style={{ color:'var(--comment)', fontSize:'10px' }}>// comment sent:</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', lineHeight:1.5 }}>{r.admin_comment}</span>
          </div>
        )}

        {/* Existing price proposal */}
        {(r.price_usd || r.price_chf || r.price_eur) && (
          <div style={s.existing}>
            <span style={{ color:'var(--blue)', fontSize:'10px', fontFamily:'var(--font-display)', letterSpacing:'0.5px' }}>// proposed price:</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px' }}>
              {[r.price_usd && `$${r.price_usd} USD`, r.price_chf && `${r.price_chf} CHF`, r.price_eur && `${r.price_eur} EUR`].filter(Boolean).join(' / ')}/mo
            </span>
            {r.price_status === 'accepted' && <span style={{ color:'var(--comment)', fontSize:'10px' }}>✓ accepted by user</span>}
            {r.price_status === 'declined'  && <span style={{ color:'var(--red)',     fontSize:'10px' }}>✗ declined by user</span>}
          </div>
        )}

        {r.admin_note && (
          <div style={s.existing}>
            <span style={{ color:'var(--comment)', fontSize:'10px' }}>// decision note:</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', lineHeight:1.5 }}>{r.admin_note}</span>
          </div>
        )}
      </div>

      {/* Action area — only for pending */}
      {!resolved && (
        <div style={s.actionArea}>
          {/* Tab switcher */}
          <div style={s.tabRow}>
            {[['comment','SEND COMMENT'],['price','PROPOSE PRICE'],['decide','APPROVE / REJECT']].map(([t,label]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ ...s.actionTab, ...(tab === t ? s.actionTabActive : {}) }}>
                {label}
              </button>
            ))}
          </div>

          {/* COMMENT tab */}
          {tab === 'comment' && (
            <div style={s.tabContent}>
              <span style={s.tabHint}>// send a message to the user without deciding yet</span>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="e.g. Could you tell us more about your planned hosting setup?"
                rows={2} style={s.textarea} />
              <div style={s.tabBtns}>
                <Btn variant="blue" onClick={() => onComment(r.id, comment)} disabled={!comment.trim()}>
                  &#9658; SEND COMMENT
                </Btn>
              </div>
            </div>
          )}

          {/* PRICE tab */}
          {tab === 'price' && (
            <div style={s.tabContent}>
              <span style={s.tabHint}>// propose a monthly price — fill at least one currency</span>
              <div style={s.priceFields}>
                <PriceField label="USD $" value={priceUsd} onChange={setPriceUsd} />
                <PriceField label="CHF"   value={priceChf} onChange={setPriceChf} />
                <PriceField label="EUR €" value={priceEur} onChange={setPriceEur} />
              </div>
              <textarea value={priceNote} onChange={e => setPriceNote(e.target.value)}
                placeholder="Optional note to accompany the price proposal..."
                rows={2} style={s.textarea} />
              <div style={s.tabBtns}>
                <Btn variant="gold" onClick={() => onProposePrice(r.id, { price_usd: priceUsd || null, price_chf: priceChf || null, price_eur: priceEur || null }, priceNote)}
                  disabled={!priceUsd && !priceChf && !priceEur}>
                  &#9658; SEND PRICE PROPOSAL
                </Btn>
              </div>
            </div>
          )}

          {/* DECIDE tab */}
          {tab === 'decide' && (
            <div style={s.tabContent}>
              <span style={s.tabHint}>// optional note to the user about this decision</span>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. Approved! Log in to configure your DNS settings."
                rows={2} style={s.textarea} />
              <div style={s.tabBtns}>
                <Btn variant="danger"  onClick={() => onReject(r.id, note)}>REJECT</Btn>
                <Btn variant="primary" onClick={() => onApprove(r.id, note)}>&#9658; APPROVE &amp; REGISTER</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriceField({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', background:'var(--surface)', border:'1px solid var(--border)', flex:1 }}>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'10px', color:'var(--gold)', padding:'6px 8px', borderRight:'1px solid var(--border)', whiteSpace:'nowrap', letterSpacing:'0.5px' }}>{label}</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0.00"
        style={{ flex:1, padding:'6px 8px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'12px', outline:'none', width:'60px' }} />
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
      <span style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px', whiteSpace:'nowrap' }}>// {label} [{count}]</span>
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
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:'12px' },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderTop:'3px solid var(--gold)', display:'flex', flexDirection:'column' },
  cardHead: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', gap:'8px', flexWrap:'wrap' },
  fqdn: { fontFamily:'var(--font-display)', fontSize:'15px', letterSpacing:'0.3px', wordBreak:'break-all' },
  statusChip: { fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 8px', letterSpacing:'1.5px', flexShrink:0 },
  cardBody: { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'6px', flex:1 },
  row: { display:'flex', alignItems:'flex-start', fontSize:'12px' },
  rowKey: { fontFamily:'var(--font-display)', color:'var(--gold)', minWidth:'90px', fontSize:'11px', letterSpacing:'0.3px', flexShrink:0 },
  rowEq: { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', flexShrink:0 },
  rowVal: { fontFamily:'var(--font-mono)', color:'var(--text)', wordBreak:'break-all', fontSize:'12px' },
  existing: { display:'flex', flexDirection:'column', gap:'3px', padding:'7px 9px', background:'var(--bg-2)', border:'1px solid var(--border)', marginTop:'2px' },
  actionArea: { borderTop:'1px solid var(--border)', background:'var(--bg)' },
  tabRow: { display:'flex', borderBottom:'1px solid var(--border)' },
  actionTab: { flex:1, padding:'7px 8px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-display)', color:'var(--muted)', fontSize:'9px', letterSpacing:'0.5px', cursor:'pointer', marginBottom:'-1px', transition:'all 0.1s' },
  actionTabActive: { color:'var(--gold)', borderBottomColor:'var(--gold)', background:'rgba(201,147,42,0.04)' },
  tabContent: { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'8px' },
  tabHint: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)' },
  textarea: { padding:'8px 10px', background:'var(--surface)', border:'1px solid var(--border)', fontFamily:'var(--font-mono)', color:'var(--text)', fontSize:'12px', outline:'none', resize:'vertical', lineHeight:1.5 },
  priceFields: { display:'flex', gap:'6px', flexWrap:'wrap' },
  tabBtns: { display:'flex', gap:'8px', justifyContent:'flex-end' },
};

// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminHistory.tsx — archived requests.
// Simple read-only list. Admin can delete individual entries
// or nuke the whole history with double confirmation.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import Btn from '../UI/Btn';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
function authHeaders() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` }; }
async function req(method, path, body = null) {
  const res  = await fetch(`${BASE}${path}`, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const STATUS_COLOR = { pending:'var(--gold)', approved:'var(--comment)', rejected:'var(--red)' };

export default function AdminHistory() {
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [clearStep,     setClearStep]     = useState(0); // 0=idle 1=confirm1 2=confirm2

  const load = useCallback(async () => {
    setLoading(true);
    try { const { requests } = await req('GET', '/admin/requests/history'); setRequests(requests); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    try { await req('DELETE', `/admin/requests/${id}`); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleClearAll() {
    if (clearStep === 0) { setClearStep(1); return; }
    if (clearStep === 1) { setClearStep(2); return; }
    // step 2 — actually delete
    try { await req('DELETE', '/admin/requests/history/all'); setClearStep(0); load(); }
    catch (err) { setError(err.message); setClearStep(0); }
  }

  if (loading) return <div style={s.loading}>// loading history<span className="cursor" /></div>;

  return (
    <div className="fade-up">
      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>// admin &gt; history.js</p>
          <h1 style={s.title}>HISTORY</h1>
          <p style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', marginTop:'4px' }}>
            // archived requests — {requests.length} total
          </p>
        </div>

        {requests.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
            {clearStep === 0 && (
              <Btn variant="danger" onClick={handleClearAll} style={{ fontSize:'11px' }}>
                CLEAR ALL HISTORY
              </Btn>
            )}
            {clearStep === 1 && (
              <>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--red)' }}>// are you sure?</span>
                <div style={{ display:'flex', gap:'8px' }}>
                  <Btn variant="ghost"  onClick={() => setClearStep(0)} style={{ fontSize:'11px' }}>CANCEL</Btn>
                  <Btn variant="danger" onClick={handleClearAll} style={{ fontSize:'11px' }}>YES, DELETE ALL</Btn>
                </div>
              </>
            )}
            {clearStep === 2 && (
              <>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--red)' }}>// this cannot be undone. confirm?</span>
                <div style={{ display:'flex', gap:'8px' }}>
                  <Btn variant="ghost"  onClick={() => setClearStep(0)} style={{ fontSize:'11px' }}>CANCEL</Btn>
                  <Btn variant="danger" onClick={handleClearAll} style={{ fontSize:'11px' }}>PERMANENTLY DELETE {requests.length} RECORDS</Btn>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {error && <div style={s.err}>ERR -- {error}</div>}

      {requests.length === 0 ? (
        <div style={s.empty}>// no history yet — archive resolved requests from the requests tab</div>
      ) : (
        <div style={s.list}>
          {requests.map(r => (
            <div key={r.id} style={s.row}>
              <div style={{ ...s.statusDot, background: STATUS_COLOR[r.status] || 'var(--muted)' }} />
              <div style={s.rowMain}>
                <span style={s.fqdn}>{r.fqdn}</span>
                <div style={s.rowMeta}>
                  <span style={{ color: STATUS_COLOR[r.status] || 'var(--muted)' }}>{r.status.toUpperCase()}</span>
                  <span style={s.metaSep}>·</span>
                  <span>{r.requester_email}</span>
                  <span style={s.metaSep}>·</span>
                  <span>{r.use_case}</span>
                  <span style={s.metaSep}>·</span>
                  <span>{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                  {(r.price_usd || r.price_chf || r.price_eur) && (
                    <>
                      <span style={s.metaSep}>·</span>
                      <span style={{ color:'var(--blue)' }}>
                        {[r.price_usd && `$${r.price_usd}`, r.price_chf && `${r.price_chf}CHF`, r.price_eur && `${r.price_eur}EUR`].filter(Boolean).join('/')}
                        /mo {r.price_status === 'accepted' ? '✓' : ''}
                      </span>
                    </>
                  )}
                </div>
                {r.admin_note && (
                  <span style={s.note}>// {r.admin_note}</span>
                )}
              </div>
              <button onClick={() => handleDelete(r.id)} title="Delete from history" style={s.delBtn}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  loading:  { fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px', padding:'20px 0' },
  header:   { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'16px' },
  eyebrow:  { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)', marginBottom:'6px' },
  title:    { fontFamily:'var(--font-display)', fontSize:'clamp(24px,4vw,36px)', letterSpacing:'2px' },
  err:      { padding:'8px 14px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  empty:    { fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px', padding:'24px', border:'1px dashed var(--border)', background:'var(--surface)' },
  list:     { display:'flex', flexDirection:'column', gap:'1px', background:'var(--border)' },
  row:      { display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 14px', background:'var(--surface)' },
  statusDot:{ width:'8px', height:'8px', borderRadius:'1px', flexShrink:0, marginTop:'4px' },
  rowMain:  { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'4px' },
  fqdn:     { fontFamily:'var(--font-display)', fontSize:'14px', letterSpacing:'0.3px', color:'var(--text)' },
  rowMeta:  { display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' },
  metaSep:  { color:'var(--border)' },
  note:     { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)', fontStyle:'italic' },
  delBtn:   { background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'14px', lineHeight:1, width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginTop:'2px' },
};

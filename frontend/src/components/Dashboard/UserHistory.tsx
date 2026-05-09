// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// UserHistory.tsx — user's dismissed request history.
// Read-only record of past approvals, rejections, conversations.
// User can delete individual records or clear all (2-step confirm).
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

const STATUS_COLOR = { pending:'var(--gold)', approved:'var(--comment)', rejected:'var(--red)' };

function formatPrice(usd, chf, eur) {
  const p = [];
  if (usd) p.push(`$${usd}`);
  if (chf) p.push(`${chf}CHF`);
  if (eur) p.push(`${eur}EUR`);
  return p.length ? p.join('/') + '/mo' : null;
}

export default function UserHistory() {
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [clearStep, setClearStep] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { requests } = await api.getMyHistory(); setRequests(requests); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    try { await api.deleteMyRequest(id); load(); }
    catch (err) { setError(err.message); }
  }

  async function handleClearAll() {
    if (clearStep < 2) { setClearStep(c => c + 1); return; }
    try { await api.clearMyHistory(); setClearStep(0); load(); }
    catch (err) { setError(err.message); setClearStep(0); }
  }

  if (loading) return (
    <div style={{ padding:'20px', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px' }}>
      // loading history<span className="cursor" />
    </div>
  );

  return (
    <div className="fade-up">
      {error && <div style={s.err}>ERR -- {error}</div>}

      {requests.length === 0 ? (
        <div style={s.empty}>
          <span style={{ color:'var(--comment)' }}>// no history yet</span><br />
          <span style={{ color:'var(--muted)', fontSize:'11px' }}>// dismissed request cards will appear here</span>
        </div>
      ) : (
        <>
          {/* Clear controls */}
          <div style={s.clearRow}>
            {clearStep === 0 && <button onClick={handleClearAll} style={s.linkBtn}>[ clear all history ]</button>}
            {clearStep === 1 && (
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px' }}>
                <span style={{ color:'var(--red)' }}>// are you sure? </span>
                <button onClick={() => setClearStep(0)} style={s.linkBtn}>[ cancel ]</button>
                {' '}
                <button onClick={handleClearAll} style={{ ...s.linkBtn, color:'var(--red)' }}>[ yes, delete all ]</button>
              </span>
            )}
            {clearStep === 2 && (
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px' }}>
                <span style={{ color:'var(--red)' }}>// permanently delete {requests.length} records? </span>
                <button onClick={() => setClearStep(0)} style={s.linkBtn}>[ cancel ]</button>
                {' '}
                <button onClick={handleClearAll} style={{ ...s.linkBtn, color:'var(--red)' }}>[ confirm ]</button>
              </span>
            )}
          </div>

          <div style={s.list}>
            {requests.map(r => {
              const price   = formatPrice(r.price_usd, r.price_chf, r.price_eur);
              const msgs    = Array.isArray(r.messages) ? r.messages.length : 0;
              const sc      = STATUS_COLOR[r.status] || 'var(--muted)';
              return (
                <div key={r.id} style={s.row}>
                  <div style={{ ...s.dot, background: sc }} />
                  <div style={s.rowContent}>
                    <div style={s.rowTop}>
                      <span style={s.fqdn}>{r.fqdn}</span>
                      <span style={{ ...s.badge, background: sc, color: r.status==='pending'?'#0A0A0A':'#F8F8F8' }}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={s.meta}>
                      <span>{r.use_case}</span>
                      {price && <><span style={s.sep}>·</span><span style={{ color:'var(--blue)' }}>{price}{r.price_status==='accepted'?' ✓':r.price_status==='declined'?' ✗':''}</span></>}
                      {msgs > 0 && <><span style={s.sep}>·</span><span>{msgs} msg{msgs!==1?'s':''}</span></>}
                      <span style={s.sep}>·</span>
                      <span>{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    {r.admin_note && <div style={s.note}>// {r.admin_note}</div>}
                  </div>
                  <button onClick={() => handleDelete(r.id)} style={s.delBtn}>×</button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  err:     { padding:'8px 14px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  empty:   { padding:'28px 20px', border:'1px dashed var(--border)', background:'var(--surface)', fontFamily:'var(--font-mono)', fontSize:'12px', lineHeight:2.2 },
  clearRow:{ marginBottom:'16px' },
  linkBtn: { background:'none', border:'none', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', cursor:'pointer', textDecoration:'underline', padding:0 },
  list:    { display:'flex', flexDirection:'column', gap:'1px', background:'var(--border)' },
  row:     { display:'flex', alignItems:'flex-start', gap:'10px', padding:'12px 14px', background:'var(--surface)' },
  dot:     { width:'8px', height:'8px', borderRadius:'1px', flexShrink:0, marginTop:'5px' },
  rowContent:{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'4px' },
  rowTop:  { display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', flexWrap:'wrap' },
  fqdn:    { fontFamily:'var(--font-display)', fontSize:'14px', color:'var(--text)', letterSpacing:'0.3px', wordBreak:'break-all' },
  badge:   { fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 8px', letterSpacing:'1.5px', flexShrink:0 },
  meta:    { display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' },
  sep:     { color:'var(--border)' },
  note:    { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)', fontStyle:'italic' },
  delBtn:  { background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'14px', lineHeight:1, width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 },
};

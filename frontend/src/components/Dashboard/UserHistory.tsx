// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// UserHistory.tsx — chronological timeline of past requests.
// Each record shows what happened step by step:
//   submitted → price proposed → accepted/declined →
//   approved/rejected → DNS configured → renewal cancelled
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

const STATUS_COLOR = { pending:'var(--gold)', approved:'var(--comment)', rejected:'var(--red)' };

function formatPrice(usd, chf, eur) {
  const p = [];
  if (usd) p.push(`$${usd}`);
  if (chf) p.push(`${chf} CHF`);
  if (eur) p.push(`${eur} EUR`);
  return p.length ? p.join(' / ') + '/mo' : null;
}

// Build a human-readable timeline of events from a request's data
function buildTimeline(r) {
  const events = [];

  events.push({
    date:  r.created_at,
    icon:  '→',
    color: 'var(--muted)',
    text:  `Submitted request for ${r.fqdn}`,
    sub:   r.use_case,
  });

  if (r.price_usd || r.price_chf || r.price_eur) {
    const price = formatPrice(r.price_usd, r.price_chf, r.price_eur);
    events.push({
      date:  r.created_at, // approximate — no separate timestamp for this
      icon:  '$',
      color: 'var(--blue)',
      text:  `Admin proposed ${price}`,
      sub:   r.price_status === 'accepted' ? 'You accepted the price' :
             r.price_status === 'declined' ? 'You declined the price' :
             'Price proposal pending',
    });
  }

  if (r.status === 'approved') {
    events.push({
      date:  r.created_at,
      icon:  '✓',
      color: 'var(--comment)',
      text:  'Request approved — subdomain registered',
      sub:   r.admin_note || null,
    });
  }

  if (r.status === 'rejected') {
    events.push({
      date:  r.created_at,
      icon:  '✗',
      color: 'var(--red)',
      text:  'Request rejected',
      sub:   r.admin_note || null,
    });
  }

  // Message count
  const msgCount = Array.isArray(r.messages) ? r.messages.length : 0;
  if (msgCount > 0) {
    events.push({
      date:  null,
      icon:  '✉',
      color: 'var(--blue)',
      text:  `${msgCount} message${msgCount !== 1 ? 's' : ''} exchanged with admin`,
      sub:   null,
    });
  }

  return events;
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
          <span style={{ color:'var(--muted)', fontSize:'11px' }}>// dismissed request cards will appear here with their full timeline</span>
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
              const sc       = STATUS_COLOR[r.status] || 'var(--muted)';
              const timeline = buildTimeline(r);
              const price    = formatPrice(r.price_usd, r.price_chf, r.price_eur);

              return (
                <div key={r.id} style={s.record}>
                  {/* Record header */}
                  <div style={s.recordHead}>
                    <div style={s.headLeft}>
                      <div style={{ ...s.statusDot, background: sc }} />
                      <div>
                        <span style={s.fqdn}>{r.fqdn}</span>
                        <div style={s.headMeta}>
                          <span style={{ ...s.statusBadge, background: sc, color: r.status==='pending'?'#0A0A0A':'#F8F8F8' }}>
                            {r.status.toUpperCase()}
                          </span>
                          {price && (
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--blue)' }}>
                              {price}
                              {r.price_status === 'accepted' ? ' ✓' : r.price_status === 'declined' ? ' ✗' : ''}
                            </span>
                          )}
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' }}>
                            {new Date(r.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(r.id)} style={s.delBtn}>×</button>
                  </div>

                  {/* Timeline */}
                  <div style={s.timeline}>
                    {timeline.map((ev, i) => (
                      <div key={i} style={s.timelineRow}>
                        {/* Vertical connector line */}
                        <div style={s.lineCol}>
                          <span style={{ ...s.evIcon, color: ev.color }}>{ev.icon}</span>
                          {i < timeline.length - 1 && <div style={s.connector} />}
                        </div>
                        <div style={s.evContent}>
                          <span style={s.evText}>{ev.text}</span>
                          {ev.sub && <span style={s.evSub}>{ev.sub}</span>}
                          {ev.date && (
                            <span style={s.evDate}>
                              {new Date(ev.date).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
  err:       { padding:'8px 14px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  empty:     { padding:'28px 20px', border:'1px dashed var(--border)', background:'var(--surface)', fontFamily:'var(--font-mono)', fontSize:'12px', lineHeight:2.2 },
  clearRow:  { marginBottom:'16px' },
  linkBtn:   { background:'none', border:'none', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', cursor:'pointer', textDecoration:'underline', padding:0 },
  list:      { display:'flex', flexDirection:'column', gap:'12px' },

  record:    { background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' },
  recordHead:{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'12px 14px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', gap:'8px' },
  headLeft:  { display:'flex', alignItems:'flex-start', gap:'10px', flex:1, minWidth:0 },
  statusDot: { width:'10px', height:'10px', borderRadius:'1px', flexShrink:0, marginTop:'4px' },
  fqdn:      { fontFamily:'var(--font-display)', fontSize:'15px', color:'var(--text)', letterSpacing:'0.3px', wordBreak:'break-all', display:'block', marginBottom:'4px' },
  headMeta:  { display:'flex', alignItems:'center', flexWrap:'wrap', gap:'8px' },
  statusBadge:{ fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 7px', letterSpacing:'1.5px' },
  delBtn:    { background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'14px', lineHeight:1, width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 },

  timeline:  { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'0' },
  timelineRow:{ display:'flex', gap:'10px', alignItems:'flex-start' },
  lineCol:   { display:'flex', flexDirection:'column', alignItems:'center', width:'20px', flexShrink:0 },
  evIcon:    { fontFamily:'var(--font-mono)', fontSize:'12px', lineHeight:1.6, userSelect:'none' },
  connector: { width:'1px', background:'var(--border)', flex:1, minHeight:'12px', margin:'2px 0' },
  evContent: { flex:1, minWidth:0, paddingBottom:'10px', display:'flex', flexDirection:'column', gap:'2px' },
  evText:    { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.5 },
  evSub:     { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--comment)', fontStyle:'italic', lineHeight:1.4 },
  evDate:    { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' },
};

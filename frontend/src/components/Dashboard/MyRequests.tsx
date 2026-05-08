// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// MyRequests.tsx — shows user's submitted requests with status.
//
// Fix: admin_comment is now ALWAYS shown when it exists,
// regardless of price_status or request status. Admin messages
// should be visible in all states, not hidden by conditions.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import * as api from '../../services/api';
import Btn from '../UI/Btn';

const STATUS_COLOR = { pending:'var(--gold)', approved:'var(--comment)', rejected:'var(--red)' };
const STATUS_DESC  = {
  pending:  'Waiting for admin review. We will get back to you within 24 hours.',
  approved: 'Approved — your subdomain is active. Configure DNS in My Domains.',
  rejected: 'This request was not approved.',
};

function formatPrice(usd, chf, eur) {
  const p = [];
  if (usd) p.push(`$${usd} USD`);
  if (chf) p.push(`${chf} CHF`);
  if (eur) p.push(`${eur} EUR`);
  return p.length ? p.join(' / ') + ' / month' : null;
}

export default function MyRequests({ requests, onRefresh }) {
  if (!requests || requests.length === 0) return null;

  return (
    <div style={s.section}>
      <div style={s.header}>
        <span style={s.headerLabel}>// MY_REQUESTS [{requests.length}]</span>
        <div style={s.headerLine} />
      </div>
      <div style={s.grid}>
        {requests.map(r => <RequestCard key={r.id} request={r} onRefresh={onRefresh} />)}
      </div>
    </div>
  );
}

function RequestCard({ request: r, onRefresh }) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  const statusColor        = STATUS_COLOR[r.status] || 'var(--muted)';
  const priceProposed      = r.price_status === 'proposed';
  const priceAccepted      = r.price_status === 'accepted';
  const priceDeclined      = r.price_status === 'declined';
  const priceStr           = formatPrice(r.price_usd, r.price_chf, r.price_eur);

  // Badge label reflects the most informative current state
  function badgeLabel() {
    if (priceProposed) return 'PRICE PROPOSED';
    if (priceAccepted) return 'PRICE ACCEPTED';
    if (priceDeclined) return 'PRICE DECLINED';
    return r.status.toUpperCase();
  }
  function badgeBg() {
    if (priceProposed) return 'var(--blue)';
    if (priceAccepted) return 'var(--comment)';
    if (priceDeclined) return 'var(--muted)';
    return statusColor;
  }

  async function handleAccept() {
    setBusy(true); setError('');
    try { await api.acceptPrice(r.id); onRefresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function handleDecline() {
    setBusy(true); setError('');
    try { await api.declinePrice(r.id); onRefresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ ...s.card, borderTopColor: badgeBg() }}>
      <div style={s.cardHead}>
        <span style={s.fqdn}>{r.fqdn}</span>
        <span style={{ ...s.badge, background: badgeBg(), color: priceProposed || priceDeclined ? '#F8F8F8' : (r.status==='pending' ? '#0A0A0A' : '#F8F8F8') }}>
          {badgeLabel()}
        </span>
      </div>

      <div style={s.cardBody}>
        <Row k="use_case" v={r.use_case} />
        <Row k="status"   v={STATUS_DESC[r.status] || r.status} muted />

        {/* Admin comment — shown whenever it exists, no conditions */}
        {r.admin_comment && (
          <div style={s.commentAlert}>
            <div style={s.alertHead}>
              <span style={s.alertDot} />
              <span style={s.alertTitle}>MESSAGE FROM ADMIN</span>
            </div>
            <p style={s.alertText}>{r.admin_comment}</p>
          </div>
        )}

        {/* Price proposal — shown when admin proposed a price */}
        {priceStr && (
          <div style={{ ...s.priceBox, borderColor: priceProposed ? 'rgba(26,92,255,0.4)' : 'var(--border)', background: priceProposed ? 'rgba(26,92,255,0.04)' : 'var(--bg-2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', color: priceProposed ? 'var(--blue)' : 'var(--muted)', letterSpacing:'1.5px' }}>
                {priceProposed ? 'MONTHLY PRICE PROPOSAL' : priceAccepted ? 'AGREED PRICE' : 'PRICE PROPOSAL (DECLINED)'}
              </span>
            </div>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'16px', color:'var(--text)', letterSpacing:'0.5px' }}>{priceStr}</span>

            {/* Accept / Decline buttons — only when proposal is still open */}
            {priceProposed && (
              <>
                {error && <p style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--red)', marginTop:'6px' }}>ERR: {error}</p>}
                <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
                  <Btn variant="danger"  onClick={handleDecline} disabled={busy}>DECLINE</Btn>
                  <Btn variant="primary" onClick={handleAccept}  disabled={busy} marquee>
                    {busy ? '// ...' : '▶ ACCEPT PROPOSAL'}
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* Admin decision note */}
        {r.admin_note && (
          <div style={s.adminNote}>
            <span style={s.noteLabel}>// admin note:</span>
            <span style={s.noteText}>{r.admin_note}</span>
          </div>
        )}

        <div style={s.date}>// submitted {new Date(r.created_at).toLocaleString('en-GB')}</div>
      </div>
    </div>
  );
}

function Row({ k, v, muted=false }) {
  return (
    <div style={s.row}>
      <span style={s.rowKey}>{k}</span>
      <span style={s.rowEq}>=</span>
      <span style={{ ...s.rowVal, fontStyle: muted ? 'italic' : 'normal', color: muted ? 'var(--muted)' : 'var(--text)' }}>{v}</span>
    </div>
  );
}

const s = {
  section:    { marginTop:'36px', marginBottom:'8px' },
  header:     { display:'flex', alignItems:'center', gap:'14px', marginBottom:'14px' },
  headerLabel:{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px', whiteSpace:'nowrap' },
  headerLine: { flex:1, height:'1px', background:'var(--border)' },
  grid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'12px' },

  card:       { background:'var(--surface)', border:'1px solid var(--border)', borderTop:'3px solid var(--gold)', display:'flex', flexDirection:'column' },
  cardHead:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', gap:'8px' },
  fqdn:       { fontFamily:'var(--font-display)', fontSize:'14px', letterSpacing:'0.3px', wordBreak:'break-all' },
  badge:      { fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 8px', letterSpacing:'1.5px', flexShrink:0 },
  cardBody:   { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'8px' },

  row:        { display:'flex', alignItems:'flex-start', fontSize:'12px' },
  rowKey:     { fontFamily:'var(--font-display)', color:'var(--gold)', minWidth:'90px', fontSize:'10px', letterSpacing:'0.3px', flexShrink:0, paddingTop:'1px' },
  rowEq:      { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', flexShrink:0 },
  rowVal:     { fontFamily:'var(--font-mono)', wordBreak:'break-all', fontSize:'12px', lineHeight:1.5 },

  commentAlert:{ padding:'10px 12px', background:'rgba(26,92,255,0.06)', border:'1px solid rgba(26,92,255,0.3)', display:'flex', flexDirection:'column', gap:'6px' },
  alertHead:  { display:'flex', alignItems:'center', gap:'8px' },
  alertDot:   { width:'8px', height:'8px', background:'var(--blue)', flexShrink:0, borderRadius:'1px' },
  alertTitle: { fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--blue)', letterSpacing:'1.5px' },
  alertText:  { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.5 },

  priceBox:   { padding:'12px', border:'1px solid', display:'flex', flexDirection:'column', gap:'4px' },
  adminNote:  { display:'flex', flexDirection:'column', gap:'4px', padding:'8px 10px', background:'rgba(201,147,42,0.06)', border:'1px solid rgba(201,147,42,0.2)' },
  noteLabel:  { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)' },
  noteText:   { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.5 },
  date:       { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)', marginTop:'4px' },
};

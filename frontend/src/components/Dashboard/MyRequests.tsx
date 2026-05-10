// @ts-nocheck
// X button now appears on approved AND rejected cards.
// Pending cards cannot be dismissed — they're still awaiting action.
// Dismissed requests are filtered server-side and never return.

import React, { useState } from 'react';
import * as api from '../../services/api';
import Btn from '../UI/Btn';
import MessageCarousel from '../UI/MessageCarousel';

const STATUS_COLOR = { pending:'var(--gold)', approved:'var(--comment)', rejected:'var(--red)' };
// Dynamic status description that reflects actual tag state
function getStatusDesc(r) {
  if (r.status === 'pending')  return 'Waiting for admin review. We will get back to you within 24 hours.';
  if (r.status === 'rejected') return 'This request was not approved.';
  if (r.status === 'approved') {
    if (!r.tag_data) return 'Subscription ended — this subdomain has been released.';
    if (r.tag_data.subscription_cancelled) return 'Renewal cancelled — subdomain will be released soon.';
    if (r.tag_data.dns_type && r.tag_data.dns_value) return `Active — DNS configured (${r.tag_data.dns_type} → ${r.tag_data.dns_value}).`;
    return 'Active — configure DNS in My Domains.';
  }
  return r.status;
}

function formatPrice(usd, chf, eur) {
  const p = [];
  if (usd) p.push(`$${usd} USD`);
  if (chf) p.push(`${chf} CHF`);
  if (eur) p.push(`${eur} EUR`);
  return p.length ? p.join(' / ') + ' / month' : null;
}

function buildMessages(r) {
  const msgs = Array.isArray(r.messages) ? [...r.messages] : [];
  if (msgs.length === 0 && r.admin_comment) {
    msgs.unshift({ id:'legacy', sender:'admin', text: r.admin_comment, sent_at: r.created_at });
  }
  return msgs;
}

async function sendUserMessage(requestId, text) {
  const data = await api.sendMessage(requestId, text, false);
  return data.messages;
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
  const [busy,        setBusy]        = useState(false);
  const [dismissBusy, setDismissBusy] = useState(false);
  const [error,       setError]       = useState('');

  const statusColor   = STATUS_COLOR[r.status] || 'var(--muted)';
  const priceProposed = r.price_status === 'proposed';
  const priceAccepted = r.price_status === 'accepted';
  const priceDeclined = r.price_status === 'declined';
  const priceStr      = formatPrice(r.price_usd, r.price_chf, r.price_eur);
  const messages      = buildMessages(r);

  // X is shown on approved and rejected — NOT on pending
  // Pending means admin hasn't acted yet, dismissing would confuse things
  const canDismiss = r.status === 'approved' || r.status === 'rejected';

  // Live state from tag_data (null/undefined = tag gone)
  const tagGone      = r.status === 'approved' && r.tag_data == null;
  const tagCancelled = r.status === 'approved' && r.tag_data != null && !!r.tag_data.subscription_cancelled;
  const tagNoDns     = r.status === 'approved' && r.tag_data != null && !r.tag_data.subscription_cancelled && !r.tag_data.dns_type;

  function badgeLabel() {
    if (tagGone || tagCancelled) return 'RENEWAL CANCELLED';
    if (tagNoDns && priceAccepted) return 'DNS NOT SET';
    if (priceProposed) return 'PRICE PROPOSED';
    if (priceAccepted) return 'PRICE ACCEPTED';
    if (priceDeclined) return 'PRICE DECLINED';
    return r.status.toUpperCase();
  }
  function badgeBg() {
    if (tagGone || tagCancelled) return 'var(--red)';
    if (tagNoDns && priceAccepted) return 'var(--orange)';
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
  async function handleDismiss() {
    setDismissBusy(true);
    try { await api.dismissRequest(r.id); onRefresh(); }
    catch (err) { setError(err.message); setDismissBusy(false); }
  }

  return (
    <div style={{ ...s.card, borderTopColor: badgeBg() }}>
      <div style={s.cardHead}>
        <span style={s.fqdn}>{r.fqdn}</span>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <span style={{ ...s.badge,
            background: badgeBg(),
            color: (priceProposed || priceDeclined || r.status === 'rejected') ? '#F8F8F8' : (r.status === 'pending' ? '#0A0A0A' : '#F8F8F8')
          }}>
            {badgeLabel()}
          </span>

          {/* X button — approved and rejected only */}
          {canDismiss && (
            <button
              onClick={handleDismiss}
              disabled={dismissBusy}
              title="Dismiss this card"
              style={s.dismissBtn}
            >
              {dismissBusy ? '…' : '×'}
            </button>
          )}
        </div>
      </div>

      <div style={s.cardBody}>
        <Row k="use_case" v={r.use_case} />
        <Row k="status"   v={getStatusDesc(r)} muted />

        {/* Conversation carousel */}
        <MessageCarousel
          requestId={r.id}
          initialMessages={messages}
          isAdmin={false}
          onSend={sendUserMessage}
          pollInterval={15000}
        />

        {/* Price proposal */}
        {priceStr && (
          <div style={{ ...s.priceBox, borderColor: priceProposed ? 'rgba(26,92,255,0.4)' : 'var(--border)', background: priceProposed ? 'rgba(26,92,255,0.04)' : 'var(--bg-2)' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', color: priceProposed ? 'var(--blue)' : 'var(--muted)', letterSpacing:'1.5px' }}>
              {priceProposed ? 'MONTHLY PRICE PROPOSAL' : priceAccepted ? 'AGREED PRICE' : 'PRICE PROPOSAL (DECLINED)'}
            </span>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'16px', color:'var(--text)', letterSpacing:'0.5px' }}>{priceStr}</span>
            {priceProposed && (
              <>
                {error && <p style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--red)' }}>ERR: {error}</p>}
                <div style={{ display:'flex', gap:'8px', marginTop:'6px' }}>
                  <Btn variant="danger"  onClick={handleDecline} disabled={busy}>DECLINE</Btn>
                  <Btn variant="primary" onClick={handleAccept}  disabled={busy}>
                    {busy ? '// ...' : '▶ ACCEPT'}
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}

        {r.admin_note && (
          <div style={s.adminNote}>
            <span style={s.noteLabel}>// decision note:</span>
            <span style={s.noteText}>{r.admin_note}</span>
          </div>
        )}

        <div style={s.date}>// submitted {new Date(r.created_at).toLocaleString('en-GB')}</div>
      </div>
    </div>
  );
}

function Row({ k, v, muted = false }) {
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
  grid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(360px, 1fr))', gap:'12px' },
  card:       { background:'var(--surface)', border:'1px solid var(--border)', borderTop:'3px solid var(--gold)', display:'flex', flexDirection:'column' },
  cardHead:   { display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', padding:'10px 14px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', gap:'8px' },
  fqdn:       { fontFamily:'var(--font-display)', fontSize:'14px', letterSpacing:'0.3px', wordBreak:'break-word', overflowWrap:'anywhere' },
  badge:      { fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 8px', letterSpacing:'1.5px', flexShrink:0 },
  // X button style — same as admin archive button for visual consistency
  dismissBtn: {
    background:'transparent', border:'1px solid var(--muted)', color:'var(--muted)',
    fontFamily:'var(--font-mono)', fontSize:'14px', lineHeight:1,
    width:'22px', height:'22px', display:'flex', alignItems:'center',
    justifyContent:'center', cursor:'pointer', flexShrink:0,
    transition:'border-color 0.1s, color 0.1s',
  },
  cardBody:   { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'10px' },
  row:        { display:'flex', alignItems:'flex-start', fontSize:'12px' },
  rowKey:     { fontFamily:'var(--font-display)', color:'var(--gold)', minWidth:'90px', fontSize:'10px', letterSpacing:'0.3px', flexShrink:0, paddingTop:'1px' },
  rowEq:      { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', flexShrink:0 },
  rowVal:     { fontFamily:'var(--font-mono)', wordBreak:'break-word', overflowWrap:'anywhere', fontSize:'12px', lineHeight:1.5 },
  priceBox:   { padding:'12px', border:'1px solid', display:'flex', flexDirection:'column', gap:'6px' },
  adminNote:  { display:'flex', flexDirection:'column', gap:'4px', padding:'8px 10px', background:'rgba(201,147,42,0.06)', border:'1px solid rgba(201,147,42,0.2)' },
  noteLabel:  { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)' },
  noteText:   { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.5 },
  date:       { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' },
};

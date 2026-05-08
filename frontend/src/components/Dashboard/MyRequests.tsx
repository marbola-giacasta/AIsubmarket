// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// MyRequests.tsx — shows the user's submitted requests.
//
// States a request can be in:
//   pending       → waiting for admin review
//   [with comment]→ admin left a note, still deciding → ALERT
//   price_proposed→ admin proposed monthly price → accept/decline
//   price_accepted→ user accepted, waiting for admin to register
//   price_declined→ user declined, back to negotiation
//   approved      → registered, configure DNS
//   rejected      → not approved
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import * as api from '../../services/api';
import Btn from '../UI/Btn';

const STATUS_COLOR = {
  pending:        'var(--muted)',
  approved:       'var(--comment)',
  rejected:       'var(--red)',
};

const STATUS_DESC = {
  pending:        'Waiting for admin review. We will get back to you within 24 hours.',
  approved:       'Approved — your subdomain is active. Configure DNS in My Domains.',
  rejected:       'This request was not approved.',
};

function formatPrice(usd, chf, eur) {
  const parts = [];
  if (usd) parts.push(`$${usd} USD`);
  if (chf) parts.push(`${chf} CHF`);
  if (eur) parts.push(`${eur} EUR`);
  return parts.length ? parts.join(' / ') + ' / month' : '—';
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
        {requests.map(r => (
          <RequestCard key={r.id} request={r} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
}

function RequestCard({ request: r, onRefresh }) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  const statusColor = STATUS_COLOR[r.status] || 'var(--muted)';

  // Decide which "state" to display — price proposal overrides plain status
  const showPriceProposal = r.price_status === 'proposed';
  const showComment       = r.admin_comment && r.price_status !== 'proposed' && r.status === 'pending';

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
    <div style={{ ...s.card, borderTopColor: showPriceProposal ? 'var(--blue)' : statusColor }}>
      <div style={s.cardHead}>
        <span style={s.fqdn}>{r.fqdn}</span>
        <span style={{ ...s.badge,
          background: showPriceProposal ? 'var(--blue)' : (r.price_status === 'accepted' ? 'var(--comment)' : (r.price_status === 'declined' ? 'var(--muted)' : (r.status === 'approved' ? 'var(--comment)' : r.status === 'rejected' ? 'var(--red)' : 'var(--gold)'))),
          color: '#F8F8F8'
        }}>
          {showPriceProposal ? 'PRICE PROPOSED' : r.price_status === 'accepted' ? 'PRICE ACCEPTED' : r.price_status === 'declined' ? 'PRICE DECLINED' : r.status.toUpperCase()}
        </span>
      </div>

      <div style={s.cardBody}>
        <Row k="use_case" v={r.use_case} />
        <Row k="status"   v={STATUS_DESC[r.status] || r.status} muted />

        {/* Admin comment alert — shown when admin left a note without deciding */}
        {showComment && (
          <div style={s.commentAlert}>
            <div style={s.alertHeader}>
              <span style={s.alertDot} />
              <span style={s.alertTitle}>MESSAGE FROM ADMIN</span>
            </div>
            <p style={s.alertText}>{r.admin_comment}</p>
          </div>
        )}

        {/* Price proposal — shown when admin proposed a monthly price */}
        {showPriceProposal && (
          <div style={s.priceProposal}>
            <div style={s.proposalHeader}>
              <span style={s.proposalDot} />
              <span style={s.proposalTitle}>MONTHLY PRICE PROPOSAL</span>
            </div>
            <div style={s.priceRow}>
              <span style={s.priceAmount}>{formatPrice(r.price_usd, r.price_chf, r.price_eur)}</span>
            </div>
            {r.admin_comment && (
              <p style={s.proposalNote}>{r.admin_comment}</p>
            )}
            {error && <p style={s.propError}>ERR: {error}</p>}
            <div style={s.proposalBtns}>
              <Btn variant="danger" onClick={handleDecline} disabled={busy}>DECLINE</Btn>
              <Btn variant="primary" onClick={handleAccept} disabled={busy}>
                {busy ? '// ...' : '▶ ACCEPT PROPOSAL'}
              </Btn>
            </div>
          </div>
        )}

        {/* Show accepted price info */}
        {r.price_status === 'accepted' && (r.price_usd || r.price_chf || r.price_eur) && (
          <div style={s.acceptedPrice}>
            <span style={{ color:'var(--comment)', fontSize:'10px', fontFamily:'var(--font-mono)' }}>// agreed price:</span>
            <span style={{ color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:'12px' }}>{formatPrice(r.price_usd, r.price_chf, r.price_eur)}</span>
          </div>
        )}

        {/* Admin note on approved/rejected */}
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
  section: { marginTop:'36px', marginBottom:'8px' },
  header: { display:'flex', alignItems:'center', gap:'14px', marginBottom:'14px' },
  headerLabel: { fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--muted)', letterSpacing:'1px', whiteSpace:'nowrap' },
  headerLine: { flex:1, height:'1px', background:'var(--border)' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'12px' },

  card: { background:'var(--surface)', border:'1px solid var(--border)', borderTop:'3px solid var(--gold)', display:'flex', flexDirection:'column' },
  cardHead: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', gap:'8px' },
  fqdn: { fontFamily:'var(--font-display)', fontSize:'14px', letterSpacing:'0.3px', wordBreak:'break-all' },
  badge: { fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 8px', letterSpacing:'1.5px', flexShrink:0 },
  cardBody: { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'8px' },
  row: { display:'flex', alignItems:'flex-start', fontSize:'12px' },
  rowKey: { fontFamily:'var(--font-display)', color:'var(--gold)', minWidth:'90px', fontSize:'10px', letterSpacing:'0.3px', flexShrink:0, paddingTop:'1px' },
  rowEq: { fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 8px', flexShrink:0 },
  rowVal: { fontFamily:'var(--font-mono)', wordBreak:'break-all', fontSize:'12px', lineHeight:1.5 },

  // Admin comment alert (before decision)
  commentAlert: { padding:'10px 12px', background:'rgba(26,92,255,0.06)', border:'1px solid rgba(26,92,255,0.25)', display:'flex', flexDirection:'column', gap:'6px' },
  alertHeader: { display:'flex', alignItems:'center', gap:'7px' },
  alertDot: { width:'7px', height:'7px', background:'var(--blue)', flexShrink:0, animation:'rippleOut 2s ease infinite' },
  alertTitle: { fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--blue)', letterSpacing:'1.5px' },
  alertText: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.5 },

  // Price proposal block
  priceProposal: { padding:'12px', background:'rgba(26,92,255,0.04)', border:'1px solid rgba(26,92,255,0.3)', display:'flex', flexDirection:'column', gap:'8px' },
  proposalHeader: { display:'flex', alignItems:'center', gap:'7px' },
  proposalDot: { width:'7px', height:'7px', background:'var(--blue)', flexShrink:0 },
  proposalTitle: { fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--blue)', letterSpacing:'1.5px' },
  priceRow: { display:'flex', alignItems:'center', gap:'10px' },
  priceAmount: { fontFamily:'var(--font-display)', fontSize:'16px', color:'var(--text)', letterSpacing:'0.5px' },
  proposalNote: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)', lineHeight:1.5, borderTop:'1px solid var(--border)', paddingTop:'8px' },
  propError: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--red)' },
  proposalBtns: { display:'flex', gap:'8px', justifyContent:'flex-end' },

  acceptedPrice: { display:'flex', flexDirection:'column', gap:'3px', padding:'8px 10px', background:'rgba(74,124,63,0.06)', border:'1px solid rgba(74,124,63,0.2)' },

  adminNote: { display:'flex', flexDirection:'column', gap:'4px', padding:'8px 10px', background:'rgba(201,147,42,0.06)', border:'1px solid rgba(201,147,42,0.2)' },
  noteLabel: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)' },
  noteText: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.5 },

  date: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)', marginTop:'4px' },
};

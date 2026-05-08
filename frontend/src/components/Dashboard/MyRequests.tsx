// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// MyRequests.tsx — shows the current user's submitted requests
// and their status. I display this below the subdomains grid
// on the dashboard so users always know where their request
// stands without having to contact anyone.
//
// Status colours match the admin panel:
//   PENDING  → gold   (waiting for admin review)
//   APPROVED → green  (registered, go configure DNS)
//   REJECTED → red    (not approved, reason shown if admin left a note)
// ─────────────────────────────────────────────────────────────

import React from 'react';

const STATUS_STYLE = {
  pending:  { bg:'var(--gold)',    color:'#0A0A0A' },
  approved: { bg:'var(--comment)', color:'#F8F8F8' },
  rejected: { bg:'var(--red)',     color:'#F8F8F8' },
};

const STATUS_DESC = {
  pending:  'Your request is waiting for admin review. We will get back to you within 24 hours.',
  approved: 'Approved! Your subdomain has been registered. Go to My Domains to configure DNS.',
  rejected: 'This request was not approved.',
};

export default function MyRequests({ requests }) {
  // I don't render the section at all if there are no requests yet —
  // no point showing an empty block to new users
  if (!requests || requests.length === 0) return null;

  return (
    <div style={s.section}>
      {/* Section header */}
      <div style={s.header}>
        <span style={s.headerLabel}>// MY_REQUESTS [{requests.length}]</span>
        <div style={s.headerLine} />
      </div>

      <div style={s.grid}>
        {requests.map(r => {
          const ss = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
          return (
            <div key={r.id} style={{ ...s.card, borderTopColor: ss.bg }}>
              {/* Card header — fqdn + status badge */}
              <div style={s.cardHead}>
                <span style={s.fqdn}>{r.fqdn}</span>
                <span style={{ ...s.badge, background: ss.bg, color: ss.color }}>
                  {r.status.toUpperCase()}
                </span>
              </div>

              <div style={s.cardBody}>
                {/* Use case the user submitted */}
                <div style={s.row}>
                  <span style={s.rowKey}>use_case</span>
                  <span style={s.rowEq}>=</span>
                  <span style={s.rowVal}>{r.use_case}</span>
                </div>

                {/* Status description — what this status means in plain language */}
                <div style={s.row}>
                  <span style={s.rowKey}>status_info</span>
                  <span style={s.rowEq}>=</span>
                  <span style={{ ...s.rowVal, color: ss.bg, fontStyle:'italic' }}>
                    {STATUS_DESC[r.status]}
                  </span>
                </div>

                {/* Admin note — only shown if the admin left a message */}
                {r.admin_note && (
                  <div style={s.adminNote}>
                    <span style={s.noteLabel}>// admin note:</span>
                    <span style={s.noteText}>{r.admin_note}</span>
                  </div>
                )}

                {/* Submitted date */}
                <div style={s.date}>
                  // submitted {new Date(r.created_at).toLocaleString('en-GB')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
  rowVal: { fontFamily:'var(--font-mono)', color:'var(--text)', wordBreak:'break-all', fontSize:'12px', lineHeight:1.5 },

  // Admin note gets a distinct visual treatment so the user notices it
  adminNote: {
    display:'flex', flexDirection:'column', gap:'4px',
    padding:'8px 10px', background:'rgba(201,147,42,0.06)',
    border:'1px solid rgba(201,147,42,0.2)',
  },
  noteLabel: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)' },
  noteText: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.5 },

  date: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)', marginTop:'4px' },
};

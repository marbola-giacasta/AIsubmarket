// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// SubdomainCard.tsx — shows a single registered subdomain.
// Added in this version: subscription status + cancel renewal btn.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import Btn from '../UI/Btn';
import * as api from '../../services/api';

const TYPE_META = {
  A:    { color:'var(--teal)',   label:'A' },
  CNAME:{ color:'var(--blue)',   label:'CNAME' },
  MX:   { color:'var(--gold)',   label:'MX' },
  TXT:  { color:'var(--orange)', label:'TXT' },
  AAAA: { color:'var(--muted)',  label:'AAAA' },
};

function formatPrice(usd, chf, eur) {
  const parts = [];
  if (usd) parts.push(`$${usd}`);
  if (chf) parts.push(`${chf} CHF`);
  if (eur) parts.push(`${eur} EUR`);
  return parts.length ? parts.join(' / ') + '/mo' : null;
}

export default function SubdomainCard({ tag, onConfigureDNS, onDelete, onRefresh }) {
  const [cancelBusy,  setCancelBusy]  = useState(false);
  const [cancelError, setCancelError] = useState('');
  const hasDns  = !!tag.dns_type;
  const tm      = TYPE_META[tag.dns_type] || TYPE_META.CNAME;
  const price   = formatPrice(tag.price_usd, tag.price_chf, tag.price_eur);
  const cancelled = tag.subscription_cancelled;

  async function handleCancelSubscription() {
    if (!confirm(`Cancel monthly renewal for ${tag.fqdn}? The subdomain stays active until the end of the current period.`)) return;
    setCancelBusy(true); setCancelError('');
    try { await api.cancelSubscription(tag.id); onRefresh(); }
    catch (err) { setCancelError(err.message); }
    finally { setCancelBusy(false); }
  }

  return (
    <div style={s.card}>
      <div style={s.topBar}>
        <span style={{ ...s.pathLabel }}>subdomains / <span style={{ color:'var(--gold)' }}>{tag.subdomain}</span></span>
        <span style={{ ...s.liveChip, background: hasDns ? 'var(--comment)' : 'var(--muted)' }}>
          {hasDns ? 'LIVE' : 'NO DNS'}
        </span>
        <button onClick={() => onDelete(tag.id)} style={s.xBtn}>[ X ]</button>
      </div>

      <div style={s.body}>
        <div style={s.domainDisplay}>
          <span style={s.subPart}>{tag.subdomain}</span>
          <span style={s.dotPart}>.</span>
          <span style={s.domPart}>{tag.domain}</span>
        </div>

        {hasDns ? (
          <div style={s.dnsRow}>
            <span style={{ ...s.typeChip, color:tm.color, borderColor:tm.color }}>{tm.label}</span>
            <span style={s.arrow}> &#9658; </span>
            <span style={s.dnsTarget}>{tag.dns_value}</span>
            {!!tag.dns_proxied && <span style={s.proxyChip}>PROXY ON</span>}
          </div>
        ) : (
          <div style={s.noDns}>// dns not configured</div>
        )}

        {/* Subscription info — only shown if a price was agreed */}
        {price && (
          <div style={{ ...s.subInfo, borderColor: cancelled ? 'var(--muted)' : 'rgba(74,124,63,0.3)', background: cancelled ? 'rgba(100,100,100,0.05)' : 'rgba(74,124,63,0.05)' }}>
            <div style={s.subInfoRow}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', color: cancelled ? 'var(--muted)' : 'var(--comment)', letterSpacing:'1px' }}>
                {cancelled ? 'RENEWAL CANCELLED' : 'ACTIVE SUBSCRIPTION'}
              </span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text)' }}>{price}</span>
            </div>
            {cancelled && tag.subscription_cancel_date && (
              <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' }}>
                // cancelled {new Date(tag.subscription_cancel_date).toLocaleDateString('en-GB')}
              </span>
            )}
            {cancelError && <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--red)' }}>ERR: {cancelError}</span>}
          </div>
        )}
      </div>

      <div style={s.footer}>
        <span style={s.dateLabel}>// {new Date(tag.created_at).toLocaleDateString('en-GB')}</span>
        <div style={s.footerBtns}>
          {/* Cancel renewal button — only if there's a price and not already cancelled */}
          {price && !cancelled && (
            <Btn variant="danger" onClick={handleCancelSubscription} disabled={cancelBusy}
              style={{ padding:'5px 12px', fontSize:'11px' }}>
              CANCEL RENEWAL
            </Btn>
          )}
          <Btn variant={hasDns ? 'blue' : 'primary'} onClick={() => onConfigureDNS(tag)}>
            &#9658; {hasDns ? 'edit dns' : 'configure dns'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

const s = {
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderTop:'2px solid var(--border-dark)', display:'flex', flexDirection:'column' },
  topBar: { display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)' },
  pathLabel: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', flex:1 },
  liveChip: { fontFamily:'var(--font-display)', fontSize:'10px', padding:'1px 8px', color:'#F8F8F8', letterSpacing:'1px' },
  xBtn: { background:'none', border:'none', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'11px', cursor:'pointer' },
  body: { padding:'14px 14px 10px' },
  domainDisplay: { display:'flex', alignItems:'baseline', marginBottom:'10px' },
  subPart: { fontFamily:'var(--font-display)', fontSize:'22px', color:'var(--text)', letterSpacing:'-0.5px' },
  dotPart: { fontFamily:'var(--font-mono)', fontSize:'18px', color:'var(--muted)' },
  domPart: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)' },
  dnsRow: { display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'10px' },
  typeChip: { fontFamily:'var(--font-display)', fontSize:'10px', border:'2px solid', padding:'1px 6px', letterSpacing:'0.5px' },
  arrow: { color:'var(--muted)', fontSize:'11px' },
  dnsTarget: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--orange)', flex:1, wordBreak:'break-all' },
  proxyChip: { fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--teal)', border:'1px solid var(--teal)', padding:'1px 5px', letterSpacing:'0.5px' },
  noDns: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)', fontStyle:'italic', marginBottom:'10px' },
  subInfo: { padding:'8px 10px', border:'1px solid', display:'flex', flexDirection:'column', gap:'4px' },
  subInfoRow: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' },
  footer: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderTop:'1px solid var(--border)', background:'var(--bg)', flexWrap:'wrap', gap:'6px' },
  dateLabel: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' },
  footerBtns: { display:'flex', gap:'6px', flexWrap:'wrap' },
};

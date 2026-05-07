import React from 'react';
import Btn from '../UI/Btn';

const TYPE_META = {
  A:    { color:'var(--teal)',   label:'A' },
  CNAME:{ color:'var(--blue)',   label:'CNAME' },
  MX:   { color:'var(--gold)',   label:'MX' },
  TXT:  { color:'var(--orange)', label:'TXT' },
  AAAA: { color:'var(--muted)',  label:'AAAA' },
};

export default function SubdomainCard({ tag, onConfigureDNS, onDelete }) {
  const hasDns = !!tag.dns_type;
  const tm = TYPE_META[tag.dns_type] || TYPE_META.CNAME;

  return (
    <div style={s.card}>
      <div style={s.topBar}>
        <span style={s.pathLabel}>subdomains / <span style={{ color:'var(--gold)' }}>{tag.subdomain}</span></span>
        <span style={{ ...s.liveChip, background: hasDns ? 'var(--green)' : 'var(--border)', color: hasDns ? '#0A0A0A' : 'var(--muted)' }}>
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
            <span style={s.thickArrow}>&#9658;</span>
            <span style={s.dnsTarget}>{tag.dns_value}</span>
            {!!tag.dns_proxied && <span style={s.proxyChip}>PROXY ON</span>}
          </div>
        ) : (
          <div style={s.noDns}>// dns not configured</div>
        )}
      </div>

      <div style={s.footer}>
        <span style={s.dateLabel}>// {new Date(tag.created_at).toLocaleDateString('en-GB')}</span>
        <Btn variant={hasDns ? 'blue' : 'primary'} onClick={() => onConfigureDNS(tag)}>
          &#9658; {hasDns ? 'edit dns' : 'configure dns'}
        </Btn>
      </div>
    </div>
  );
}

const s = {
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderTop:'2px solid var(--border-dark)', display:'flex', flexDirection:'column' },
  topBar: { display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)' },
  pathLabel: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', flex:1 },
  liveChip: { fontFamily:'var(--font-display)', fontSize:'10px', padding:'1px 8px', letterSpacing:'1px' },
  xBtn: { background:'none', border:'none', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'11px', cursor:'pointer' },

  body: { padding:'16px 14px 12px' },
  domainDisplay: { display:'flex', alignItems:'baseline', marginBottom:'12px' },
  subPart: { fontFamily:'var(--font-display)', fontSize:'26px', color:'var(--text)', letterSpacing:'-0.5px' },
  dotPart: { fontFamily:'var(--font-mono)', fontSize:'20px', color:'var(--muted)' },
  domPart: { fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--muted)' },

  dnsRow: { display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' },
  typeChip: { fontFamily:'var(--font-display)', fontSize:'11px', border:'2px solid', padding:'1px 8px', letterSpacing:'1px' },
  thickArrow: { color:'var(--muted)', fontSize:'14px' },
  dnsTarget: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--orange)', flex:1, wordBreak:'break-all' },
  proxyChip: { fontFamily:'var(--font-display)', fontSize:'10px', color:'var(--teal)', border:'1px solid var(--teal)', padding:'1px 6px', letterSpacing:'0.5px' },
  noDns: { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)', fontStyle:'italic' },

  footer: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderTop:'1px solid var(--border)', background:'var(--bg)' },
  dateLabel: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' },
};

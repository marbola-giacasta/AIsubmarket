// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminDomains.tsx — admin view of all registered subdomains.
// Shows per-user subscription health at a glance:
//   ✓ DNS configured (type + value)
//   ✗ No DNS set up
//   ⚠ DNS deleted but subscription still active
//   ∅ Subscription cancelled
//   $ Price agreed / free
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
function authHeaders() { return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` }; }
async function req(method, path) {
  const res  = await fetch(`${BASE}${path}`, { method, headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

const DNS_COLOR = { A:'var(--teal)', CNAME:'var(--blue)', MX:'var(--gold)', TXT:'var(--orange)', AAAA:'var(--muted)' };

// Derive a health status from the tag's fields
function getHealth(tag) {
  if (tag.subscription_cancelled) {
    return { label:'CANCELLED', color:'var(--muted)', icon:'∅', note:'Subscription cancelled — tag released soon' };
  }
  if (tag.dns_type && tag.dns_value) {
    return { label:'LIVE', color:'var(--comment)', icon:'✓', note:`${tag.dns_type} → ${tag.dns_value}` };
  }
  if (!tag.dns_type && !tag.dns_value && tag.dns_updated_at) {
    // Had DNS before (dns_updated_at set) but no current record — DNS was deleted
    return { label:'DNS REMOVED', color:'var(--orange)', icon:'⚠', note:'DNS was deleted — subscription still active' };
  }
  return { label:'NO DNS', color:'var(--red)', icon:'✗', note:'Subdomain registered but DNS not configured yet' };
}

function formatPrice(usd, chf, eur) {
  const p = [];
  if (usd) p.push(`$${usd}`);
  if (chf) p.push(`${chf}CHF`);
  if (eur) p.push(`${eur}EUR`);
  return p.length ? p.join('/') + '/mo' : null;
}

export default function AdminDomains() {
  const [subdomains, setSubdomains] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all'); // all | live | nodns | cancelled
  const isMobile = useIsMobile(640);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { subdomains } = await req('GET', '/admin/subdomains'); setSubdomains(subdomains); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = subdomains.filter(tag => {
    const health = getHealth(tag);
    const matchSearch =
      tag.fqdn.includes(search.toLowerCase()) ||
      (tag.owner_email || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'       ? true :
      filter === 'live'      ? health.label === 'LIVE' :
      filter === 'nodns'     ? (health.label === 'NO DNS' || health.label === 'DNS REMOVED') :
      filter === 'cancelled' ? health.label === 'CANCELLED' :
      true;
    return matchSearch && matchFilter;
  });

  // Count by health for stat badges
  const counts = subdomains.reduce((acc, tag) => {
    const h = getHealth(tag).label;
    acc[h] = (acc[h] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div style={s.loading}>// loading subdomains<span className="cursor" /></div>;

  return (
    <div className="fade-up">
      {error && <div style={s.err}>ERR -- {error}</div>}

      {/* Stats bar */}
      <div style={s.statsRow}>
        <StatChip label="TOTAL"       value={subdomains.length}       color="var(--muted)"    active={filter==='all'}       onClick={() => setFilter('all')} />
        <StatChip label="LIVE"        value={counts['LIVE'] || 0}     color="var(--comment)"  active={filter==='live'}      onClick={() => setFilter('live')} />
        <StatChip label="NO DNS"      value={(counts['NO DNS']||0)+(counts['DNS REMOVED']||0)} color="var(--red)" active={filter==='nodns'} onClick={() => setFilter('nodns')} />
        <StatChip label="CANCELLED"   value={counts['CANCELLED']||0}  color="var(--muted)"    active={filter==='cancelled'} onClick={() => setFilter('cancelled')} />
      </div>

      {/* Search */}
      <div style={s.searchRow}>
        <span style={s.searchPrefix}>// filter:</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search fqdn or email..."
          style={s.searchInput}
        />
        {search && <button onClick={() => setSearch('')} style={s.clearBtn}>[ clear ]</button>}
      </div>

      {filtered.length === 0 && <div style={s.empty}>// no results</div>}

      {/* Cards grid */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px,1fr))', gap:'8px' }}>
        {filtered.map(tag => {
          const health = getHealth(tag);
          const price  = formatPrice(tag.price_usd, tag.price_chf, tag.price_eur);

          return (
            <div key={tag.id} style={{ ...s.card, borderLeftColor: health.color }}>
              {/* Header */}
              <div style={s.cardHead}>
                <div style={s.headLeft}>
                  <span style={{ ...s.healthIcon, color: health.color }}>{health.icon}</span>
                  <span style={s.fqdn}>{tag.fqdn}</span>
                </div>
                <span style={{ ...s.healthBadge, background: health.color, color: health.label === 'LIVE' ? '#F8F8F8' : (health.label === 'CANCELLED' ? '#F8F8F8' : '#0A0A0A') }}>
                  {health.label}
                </span>
              </div>

              {/* Details */}
              <div style={s.cardBody}>
                <Row k="owner"   v={tag.owner_email || '—'} />
                <Row k="note"    v={health.note} muted />

                {/* DNS details */}
                {tag.dns_type && tag.dns_value && (
                  <div style={s.dnsBlock}>
                    <span style={{ ...s.dnsType, color: DNS_COLOR[tag.dns_type] || 'var(--muted)', borderColor: DNS_COLOR[tag.dns_type] || 'var(--muted)' }}>{tag.dns_type}</span>
                    <span style={s.dnsArrow}>→</span>
                    <span style={s.dnsValue}>{tag.dns_value}</span>
                    {!!tag.dns_proxied && <span style={s.proxyBadge}>CF PROXY</span>}
                  </div>
                )}

                {/* Missing DNS warning */}
                {!tag.dns_type && !tag.dns_value && !tag.subscription_cancelled && (
                  <div style={s.warningRow}>
                    <span style={{ color:'var(--red)', fontSize:'10px' }}>⚠ </span>
                    <span style={{ color:'var(--red)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>
                      {tag.dns_updated_at ? 'DNS was removed — user needs to reconfigure' : 'User has not configured DNS yet'}
                    </span>
                  </div>
                )}

                {/* Subscription / price */}
                <div style={s.subRow}>
                  {price ? (
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--blue)' }}>
                      $ {price}
                    </span>
                  ) : (
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' }}>
                      // free / no price set
                    </span>
                  )}
                  {tag.subscription_cancelled && tag.subscription_cancel_date && (
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' }}>
                      cancelled {new Date(tag.subscription_cancel_date).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>

                {/* Timestamps */}
                <div style={s.dateRow}>
                  <span style={s.dateLabel}>registered {new Date(tag.created_at).toLocaleDateString('en-GB')}</span>
                  {tag.dns_updated_at && (
                    <span style={s.dateLabel}>· dns updated {new Date(tag.dns_updated_at).toLocaleDateString('en-GB')}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ k, v, muted = false }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'0', fontSize:'11px' }}>
      <span style={{ fontFamily:'var(--font-display)', color:'var(--gold)', minWidth:'60px', fontSize:'10px', letterSpacing:'0.3px', flexShrink:0 }}>{k}</span>
      <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', padding:'0 6px', flexShrink:0 }}>=</span>
      <span style={{ fontFamily:'var(--font-mono)', color: muted ? 'var(--muted)' : 'var(--text)', wordBreak:'break-all', lineHeight:1.4, fontStyle: muted ? 'italic' : 'normal' }}>{v}</span>
    </div>
  );
}

function StatChip({ label, value, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 16px',
      background: active ? 'var(--surface-dark)' : 'var(--surface)',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      cursor:'pointer', gap:'2px', transition:'all 0.1s',
    }}>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'22px', color, lineHeight:1 }}>{value}</span>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', color: active ? color : 'var(--muted)', letterSpacing:'1px' }}>{label}</span>
    </button>
  );
}

const s = {
  loading:   { fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px', padding:'20px 0' },
  err:       { padding:'8px 14px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  statsRow:  { display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' },
  searchRow: { display:'flex', alignItems:'center', marginBottom:'16px', background:'var(--surface)', border:'1px solid var(--border)' },
  searchPrefix:{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px', padding:'8px 12px', borderRight:'1px solid var(--border)', whiteSpace:'nowrap' },
  searchInput: { flex:1, padding:'8px 12px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--text)', fontSize:'13px', outline:'none' },
  clearBtn:  { padding:'8px 12px', background:'transparent', border:'none', borderLeft:'1px solid var(--border)', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'11px', cursor:'pointer' },
  empty:     { fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px', padding:'20px', border:'1px dashed var(--border)', background:'var(--surface)' },
  card:      { background:'var(--surface)', border:'1px solid var(--border)', borderLeft:'3px solid var(--muted)', display:'flex', flexDirection:'column' },
  cardHead:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--bg-2)', borderBottom:'1px solid var(--border)', gap:'8px' },
  headLeft:  { display:'flex', alignItems:'center', gap:'8px', minWidth:0 },
  healthIcon:{ fontFamily:'var(--font-mono)', fontSize:'14px', flexShrink:0 },
  fqdn:      { fontFamily:'var(--font-display)', fontSize:'13px', color:'var(--text)', letterSpacing:'0.3px', wordBreak:'break-all' },
  healthBadge:{ fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 7px', letterSpacing:'1px', flexShrink:0 },
  cardBody:  { padding:'10px 12px', display:'flex', flexDirection:'column', gap:'6px' },
  dnsBlock:  { display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', padding:'5px 8px', background:'var(--bg)', border:'1px solid var(--border)' },
  dnsType:   { fontFamily:'var(--font-display)', fontSize:'9px', border:'1px solid', padding:'1px 5px', letterSpacing:'0.5px', flexShrink:0 },
  dnsArrow:  { fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'11px' },
  dnsValue:  { fontFamily:'var(--font-mono)', color:'var(--orange)', fontSize:'11px', wordBreak:'break-all' },
  proxyBadge:{ fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--teal)', border:'1px solid var(--teal)', padding:'1px 5px', letterSpacing:'0.5px', flexShrink:0 },
  warningRow:{ display:'flex', alignItems:'flex-start', gap:'4px', padding:'4px 8px', background:'rgba(192,57,43,0.05)', border:'1px solid rgba(192,57,43,0.2)' },
  subRow:    { display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'6px' },
  dateRow:   { display:'flex', flexWrap:'wrap', gap:'4px' },
  dateLabel: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' },
};

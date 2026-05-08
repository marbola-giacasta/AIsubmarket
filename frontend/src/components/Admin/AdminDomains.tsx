// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminDomains.tsx — shows every registered subdomain across
// all users. I can see who owns what and what DNS they've set.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
function getToken() { return localStorage.getItem('token'); }
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}
async function req(method, path) {
  const res  = await fetch(`${BASE}${path}`, { method, headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const TYPE_COLOR = { A: 'var(--teal)', CNAME: 'var(--blue)', MX: 'var(--gold)', TXT: 'var(--orange)', AAAA: 'var(--muted)' };

export default function AdminDomains() {
  const [subdomains, setSubdomains] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { subdomains } = await req('GET', '/admin/subdomains');
      setSubdomains(subdomains);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = subdomains.filter(s =>
    s.fqdn.includes(search.toLowerCase()) ||
    (s.owner_email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={s.loading}>// loading domains<span className="cursor" /></div>;

  return (
    <div className="fade-up">
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>// admin &gt; all_domains.js</p>
          <h1 style={s.title}>ALL DOMAINS</h1>
        </div>
        <div style={s.statsRow}>
          <div style={s.totalBadge}>
            <span style={s.totalNum}>{subdomains.length}</span>
            <span style={s.totalLabel}>REGISTERED</span>
          </div>
        </div>
      </div>

      {error && <div style={s.err}>ERR -- {error}</div>}

      {/* Search */}
      <div style={s.searchRow}>
        <span style={s.searchPrefix}>// filter:</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search by fqdn or email..."
          style={s.searchInput}
        />
        {search && <button onClick={() => setSearch('')} style={s.clearBtn}>[ clear ]</button>}
      </div>

      {/* Table */}
      <div style={s.table}>
        <div style={s.tableHead}>
          <div style={{ ...s.th, flex: 3 }}>SUBDOMAIN</div>
          <div style={{ ...s.th, flex: 2 }}>OWNER</div>
          <div style={{ ...s.th, flex: 2 }}>DNS</div>
          <div style={{ ...s.th, flex: 1 }}>DATE</div>
        </div>

        {filtered.length === 0 && (
          <div style={s.empty}>// no results</div>
        )}

        {filtered.map(tag => (
          <div key={tag.id} style={s.tableRow}>
            <div style={{ ...s.td, flex: 3 }}>
              <span style={s.fqdn}>{tag.fqdn}</span>
            </div>
            <div style={{ ...s.td, flex: 2 }}>
              <span style={s.email}>{tag.owner_email || '—'}</span>
            </div>
            <div style={{ ...s.td, flex: 2 }}>
              {tag.dns_type ? (
                <span style={s.dnsRow}>
                  <span style={{ ...s.typeChip, color: TYPE_COLOR[tag.dns_type] || 'var(--muted)', borderColor: TYPE_COLOR[tag.dns_type] || 'var(--muted)' }}>{tag.dns_type}</span>
                  <span style={s.dnsVal}>{tag.dns_value}</span>
                </span>
              ) : (
                <span style={s.noDns}>// no dns</span>
              )}
            </div>
            <div style={{ ...s.td, flex: 1 }}>
              <span style={s.date}>{new Date(tag.created_at).toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  loading: { fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: '13px', padding: '20px 0' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  eyebrow: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--comment)', marginBottom: '6px' },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,36px)', letterSpacing: '2px' },
  statsRow: { display: 'flex', gap: '12px' },
  totalBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 20px', background: 'var(--surface-dark)', border: '1px solid var(--border-dark)' },
  totalNum: { fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--green)', lineHeight: 1 },
  totalLabel: { fontFamily: 'var(--font-display)', fontSize: '9px', color: 'var(--muted)', letterSpacing: '1.5px', marginTop: '3px' },
  err: { padding: '8px 14px', background: 'rgba(192,57,43,0.08)', border: '1px solid var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)', marginBottom: '16px' },
  searchRow: { display: 'flex', alignItems: 'center', gap: '0', marginBottom: '16px', background: 'var(--surface)', border: '1px solid var(--border)' },
  searchPrefix: { fontFamily: 'var(--font-mono)', color: 'var(--comment)', fontSize: '12px', padding: '9px 12px', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' },
  searchInput: { flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: '13px', outline: 'none' },
  clearBtn: { padding: '9px 12px', background: 'transparent', border: 'none', borderLeft: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' },
  table: { border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' },
  tableHead: { display: 'flex', background: 'var(--surface-dark2)', borderBottom: '1px solid var(--border-dark)', padding: '0' },
  th: { padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px' },
  tableRow: { display: 'flex', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: 'background 0.1s' },
  td: { padding: '10px 12px', minWidth: 0 },
  fqdn: { fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--text)', letterSpacing: '0.3px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  email: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dnsRow: { display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' },
  typeChip: { fontFamily: 'var(--font-display)', fontSize: '9px', border: '1px solid', padding: '1px 5px', letterSpacing: '0.5px', flexShrink: 0 },
  dnsVal: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--orange)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  noDns: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' },
  date: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' },
  empty: { padding: '20px', fontFamily: 'var(--font-mono)', color: 'var(--comment)', fontSize: '12px' },
};

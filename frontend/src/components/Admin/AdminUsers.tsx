// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminUsers.tsx — shows all registered users, how many
// subdomains each one owns, and whether they are admin.
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

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { users } = await req('GET', '/admin/users');
      setUsers(users);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={s.loading}>// loading users<span className="cursor" /></div>;

  return (
    <div className="fade-up">
      <div style={s.pageHeader}>
        <div>
          <p style={s.eyebrow}>// admin &gt; users.js</p>
          <h1 style={s.title}>USERS</h1>
        </div>
        <div style={s.totalBadge}>
          <span style={s.totalNum}>{users.length}</span>
          <span style={s.totalLabel}>REGISTERED</span>
        </div>
      </div>

      {error && <div style={s.err}>ERR -- {error}</div>}

      <div style={s.table}>
        <div style={s.tableHead}>
          <div style={{ ...s.th, flex: 3 }}>EMAIL</div>
          <div style={{ ...s.th, flex: 1 }}>DOMAINS</div>
          <div style={{ ...s.th, flex: 1 }}>ROLE</div>
          <div style={{ ...s.th, flex: 1 }}>JOINED</div>
        </div>

        {users.length === 0 && <div style={s.empty}>// no users yet</div>}

        {users.map(u => (
          <div key={u.id} style={s.tableRow}>
            <div style={{ ...s.td, flex: 3 }}>
              <span style={s.email}>{u.email}</span>
            </div>
            <div style={{ ...s.td, flex: 1 }}>
              <span style={s.count}>{u.domain_count ?? 0}</span>
            </div>
            <div style={{ ...s.td, flex: 1 }}>
              {u.is_admin
                ? <span style={s.adminChip}>ADMIN</span>
                : <span style={s.userChip}>USER</span>
              }
            </div>
            <div style={{ ...s.td, flex: 1 }}>
              <span style={s.date}>{new Date(u.created_at).toLocaleDateString('en-GB')}</span>
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
  totalBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 20px', background: 'var(--surface-dark)', border: '1px solid var(--border-dark)' },
  totalNum: { fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--gold)', lineHeight: 1 },
  totalLabel: { fontFamily: 'var(--font-display)', fontSize: '9px', color: 'var(--muted)', letterSpacing: '1.5px', marginTop: '3px' },
  err: { padding: '8px 14px', background: 'rgba(192,57,43,0.08)', border: '1px solid var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)', marginBottom: '16px' },
  table: { border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden' },
  tableHead: { display: 'flex', background: 'var(--surface-dark2)', borderBottom: '1px solid var(--border-dark)' },
  th: { padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px' },
  tableRow: { display: 'flex', borderBottom: '1px solid var(--border)', alignItems: 'center' },
  td: { padding: '10px 12px', minWidth: 0 },
  email: { fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  count: { fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--blue)' },
  adminChip: { fontFamily: 'var(--font-display)', fontSize: '9px', background: 'var(--gold)', color: '#0A0A0A', padding: '2px 8px', letterSpacing: '1px' },
  userChip: { fontFamily: 'var(--font-display)', fontSize: '9px', border: '1px solid var(--border)', color: 'var(--muted)', padding: '2px 8px', letterSpacing: '1px' },
  date: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' },
  empty: { padding: '20px', fontFamily: 'var(--font-mono)', color: 'var(--comment)', fontSize: '12px' },
};

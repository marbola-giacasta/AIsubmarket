// @ts-nocheck
// Mobile fix: card layout on mobile instead of overflowing table

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

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const isMobile = useIsMobile(640);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { users } = await req('GET', '/admin/users'); setUsers(users); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={s.loading}>// loading users<span className="cursor" /></div>;

  return (
    <div className="fade-up">
      {error && <div style={s.err}>ERR -- {error}</div>}

      {isMobile ? (
        // Card layout on mobile — no horizontal overflow
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {users.length === 0 && <div style={s.empty}>// no users yet</div>}
          {users.map(u => (
            <div key={u.id} style={s.card}>
              <div style={s.cardHead}>
                <span style={s.email}>{u.email}</span>
                {u.is_admin
                  ? <span style={s.adminChip}>ADMIN</span>
                  : <span style={s.userChip}>USER</span>
                }
              </div>
              <div style={s.cardMeta}>
                <span style={s.metaItem}><span style={s.metaKey}>domains</span> <span style={{ color:'var(--blue)' }}>{u.domain_count ?? 0}</span></span>
                <span style={s.metaItem}><span style={s.metaKey}>joined</span> {new Date(u.created_at).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Table layout on desktop
        <div style={s.table}>
          <div style={s.tableHead}>
            <div style={{ ...s.th, flex:3 }}>EMAIL</div>
            <div style={{ ...s.th, flex:1 }}>DOMAINS</div>
            <div style={{ ...s.th, flex:1 }}>ROLE</div>
            <div style={{ ...s.th, flex:1 }}>JOINED</div>
          </div>
          {users.length === 0 && <div style={s.empty}>// no users yet</div>}
          {users.map(u => (
            <div key={u.id} style={s.tableRow}>
              <div style={{ ...s.td, flex:3 }}>
                <span style={s.email}>{u.email}</span>
              </div>
              <div style={{ ...s.td, flex:1 }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', color:'var(--blue)' }}>{u.domain_count ?? 0}</span>
              </div>
              <div style={{ ...s.td, flex:1 }}>
                {u.is_admin
                  ? <span style={s.adminChip}>ADMIN</span>
                  : <span style={s.userChip}>USER</span>
                }
              </div>
              <div style={{ ...s.td, flex:1 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' }}>
                  {new Date(u.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  loading:   { fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'13px', padding:'20px 0' },
  err:       { padding:'8px 14px', background:'rgba(192,57,43,0.08)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  empty:     { padding:'20px', fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' },
  // Mobile cards
  card:      { background:'var(--surface)', border:'1px solid var(--border)', borderLeft:'3px solid var(--border-dark)' },
  cardHead:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderBottom:'1px solid var(--border)', gap:'8px' },
  cardMeta:  { display:'flex', gap:'16px', padding:'8px 12px', flexWrap:'wrap' },
  metaItem:  { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', display:'flex', gap:'6px' },
  metaKey:   { color:'var(--gold)', fontFamily:'var(--font-display)', fontSize:'10px', letterSpacing:'0.5px' },
  email:     { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 },
  adminChip: { fontFamily:'var(--font-display)', fontSize:'9px', background:'var(--gold)', color:'#0A0A0A', padding:'2px 8px', letterSpacing:'1px', flexShrink:0 },
  userChip:  { fontFamily:'var(--font-display)', fontSize:'9px', border:'1px solid var(--border)', color:'var(--muted)', padding:'2px 8px', letterSpacing:'1px', flexShrink:0 },
  // Desktop table
  table:     { border:'1px solid var(--border)', background:'var(--surface)', overflow:'hidden' },
  tableHead: { display:'flex', background:'var(--surface-dark2)', borderBottom:'1px solid var(--border-dark)' },
  th:        { padding:'8px 12px', fontFamily:'var(--font-display)', fontSize:'10px', color:'var(--muted)', letterSpacing:'1px' },
  tableRow:  { display:'flex', borderBottom:'1px solid var(--border)', alignItems:'center' },
  td:        { padding:'10px 12px', minWidth:0 },
};

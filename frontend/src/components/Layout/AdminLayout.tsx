// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminLayout.tsx — the shell that wraps every admin page.
// This is completely separate from the regular user Layout.
// Regular users never see this. Admins never see the user Layout.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function AdminLayout({ children }) {
  const { user, logoutUser } = useAuth();
  const { pathname } = useLocation();
  const isMobile = useIsMobile(768);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={s.shell}>

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <span style={s.adminBadge}>ADMIN</span>
          <span style={s.siteName}># SubMarket</span>
        </div>

        {!isMobile && (
          <div style={s.nav}>
            <NavLink to="/admin"          active={pathname === '/admin'}>requests.js</NavLink>
            <NavLink to="/admin/domains"  active={pathname === '/admin/domains'}>all_domains.js</NavLink>
            <NavLink to="/admin/users"    active={pathname === '/admin/users'}>users.js</NavLink>
          </div>
        )}

        <div style={s.topRight}>
          {!isMobile && <span style={s.adminEmail}>{user?.email}</span>}
          <button onClick={logoutUser} style={s.logoutBtn}>[ logout ]</button>
          {isMobile && (
            <button style={s.burger} onClick={() => setMenuOpen(!menuOpen)}>
              <span style={s.bLine} /><span style={s.bLine} /><span style={s.bLine} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMobile && menuOpen && (
        <div style={s.dropdown}>
          <MobileLink to="/admin"         active={pathname==='/admin'}         onClick={() => setMenuOpen(false)}>requests.js</MobileLink>
          <MobileLink to="/admin/domains" active={pathname==='/admin/domains'} onClick={() => setMenuOpen(false)}>all_domains.js</MobileLink>
          <MobileLink to="/admin/users"   active={pathname==='/admin/users'}   onClick={() => setMenuOpen(false)}>users.js</MobileLink>
          <div style={s.dropEmail}>{user?.email}</div>
        </div>
      )}

      {/* Gold accent bar under top bar */}
      <div style={s.accentBar} />

      {/* Main content area */}
      <main style={s.main}>
        {children}
      </main>

      {/* Status bar */}
      <div style={s.statusBar}>
        <span style={s.statusItem}>SubMarket Admin</span>
        <span style={s.statusItem}>admin@{user?.email}</span>
        <span style={{ ...s.statusItem, marginLeft: 'auto' }}>v1.0</span>
      </div>

    </div>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link to={to} style={{ ...s.navLink, ...(active ? s.navLinkActive : {}) }}>
      {active && <span style={s.navDot} />}
      {children}
    </Link>
  );
}

function MobileLink({ to, active, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} style={s.dropLink}>
      <span style={{ color: active ? 'var(--gold)' : 'var(--muted)' }}>
        {active ? '> ' : '  '}{children}
      </span>
    </Link>
  );
}

const s = {
  shell: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' },

  topBar: {
    display: 'flex', alignItems: 'stretch', height: '48px',
    background: 'var(--surface-dark)', borderBottom: '1px solid var(--border-dark)',
    position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderRight: '1px solid var(--border-dark)', flexShrink: 0 },
  adminBadge: {
    fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '2px',
    background: 'var(--gold)', color: '#0A0A0A', padding: '2px 8px',
  },
  siteName: { fontFamily: 'var(--font-display)', fontSize: '14px', color: '#F8F8F8', letterSpacing: '1px' },

  nav: { display: 'flex', alignItems: 'stretch', flex: 1 },
  navLink: {
    display: 'flex', alignItems: 'center', gap: '7px',
    padding: '0 18px', fontFamily: 'var(--font-mono)', fontSize: '12px',
    color: 'var(--muted)', borderRight: '1px solid var(--border-dark)',
    position: 'relative', whiteSpace: 'nowrap', textDecoration: 'none',
    transition: 'color 0.1s',
  },
  navLinkActive: { color: 'var(--gold)', background: 'rgba(201,147,42,0.06)' },
  navDot: { width: '6px', height: '6px', background: 'var(--gold)', display: 'inline-block', flexShrink: 0 },

  topRight: { display: 'flex', alignItems: 'center', marginLeft: 'auto', borderLeft: '1px solid var(--border-dark)' },
  adminEmail: { padding: '0 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' },
  logoutBtn: { height: '100%', padding: '0 14px', background: 'transparent', border: 'none', borderLeft: '1px solid var(--border-dark)', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' },
  burger: { height: '100%', padding: '0 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', background: 'transparent', border: 'none', borderLeft: '1px solid var(--border-dark)', cursor: 'pointer' },
  bLine: { display: 'block', width: '18px', height: '2px', background: 'var(--muted)' },

  dropdown: { position: 'fixed', top: '49px', left: 0, right: 0, zIndex: 99, background: 'var(--surface-dark)', borderBottom: '2px solid var(--gold)', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' },
  dropLink: { padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: '13px', borderBottom: '1px solid var(--border-dark)', textDecoration: 'none' },
  dropEmail: { padding: '10px 20px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' },

  accentBar: { height: '3px', background: 'var(--gold)', flexShrink: 0 },

  main: { flex: 1, padding: 'clamp(20px, 4vw, 40px)', maxWidth: '1200px', width: '100%', margin: '0 auto' },

  statusBar: { display: 'flex', alignItems: 'center', height: '22px', background: 'var(--gold)', flexShrink: 0 },
  statusItem: { padding: '0 10px', fontSize: '11px', color: '#0A0A0A', fontFamily: 'var(--font-display)', borderRight: '1px solid rgba(0,0,0,0.15)', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
};

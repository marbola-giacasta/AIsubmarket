// @ts-nocheck
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const { pathname }         = useLocation();
  const isMobile             = useIsMobile(768);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav style={s.nav}>
        <div style={s.logo}>
          <span style={s.hash}>#</span>
          <span style={s.name}>{isMobile ? 'SM' : 'SubMarket'}</span>
        </div>

        {/* Desktop tabs — hidden on mobile */}
        {!isMobile && (
          <div style={s.tabs}>
            <Tab to="/dashboard" active={pathname === '/dashboard'}>dashboard.js</Tab>
            <Tab to="/purchase"  active={pathname === '/purchase'}>purchase.js</Tab>
          </div>
        )}

        {/* Desktop email + logout */}
        {!isMobile && (
          <div style={s.right}>
            <span style={s.email}>{user?.email}</span>
            <button onClick={logoutUser} style={s.logoutBtn}>[ logout ]</button>
          </div>
        )}

        {/* Mobile hamburger — hidden on desktop */}
        {isMobile && (
          <button style={s.burger} onClick={() => setMenuOpen(o => !o)}>
            <span style={s.bLine} /><span style={s.bLine} /><span style={s.bLine} />
          </button>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={s.dropdown}>
          <DropLink to="/dashboard" active={pathname==='/dashboard'} onClick={() => setMenuOpen(false)}>dashboard.js</DropLink>
          <DropLink to="/purchase"  active={pathname==='/purchase'}  onClick={() => setMenuOpen(false)}>purchase.js</DropLink>
          <div style={s.dropDivider} />
          <div style={s.dropEmail}>{user?.email}</div>
          <button onClick={() => { logoutUser(); setMenuOpen(false); }} style={s.dropLogout}>[ logout ]</button>
        </div>
      )}
    </>
  );
}

function Tab({ to, active, children }) {
  return (
    <Link to={to} style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
      {active && <span style={s.tabBar} />}
      {children}
    </Link>
  );
}

function DropLink({ to, active, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} style={s.dropLink}>
      <span style={{ color: active ? 'var(--blue)' : 'var(--muted)' }}>{active ? '> ' : '  '}{children}</span>
    </Link>
  );
}

const s = {
  nav: { display:'flex', alignItems:'stretch', height:'44px', background:'var(--surface-dark)', borderBottom:'2px solid var(--green)', position:'sticky', top:0, zIndex:100, flexShrink:0 },
  logo: { display:'flex', alignItems:'center', gap:'6px', padding:'0 14px', borderRight:'1px solid var(--border-dark)', flexShrink:0 },
  hash: { color:'var(--blue)', fontFamily:'var(--font-display)', fontSize:'18px' },
  name: { fontFamily:'var(--font-display)', fontSize:'14px', color:'#F8F8F8', letterSpacing:'1px' },
  tabs: { display:'flex', alignItems:'stretch', flex:1 },
  tab: { display:'flex', alignItems:'center', gap:'8px', padding:'0 16px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)', borderRight:'1px solid var(--border-dark)', position:'relative', whiteSpace:'nowrap', textDecoration:'none' },
  tabActive: { color:'var(--blue)', background:'rgba(26,92,255,0.06)' },
  tabBar: { position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'var(--blue)' },
  right: { display:'flex', alignItems:'center', marginLeft:'auto', borderLeft:'1px solid var(--border-dark)' },
  email: { padding:'0 12px', fontSize:'11px', color:'var(--muted)', fontFamily:'var(--font-mono)', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn: { height:'100%', padding:'0 14px', background:'transparent', border:'none', borderLeft:'1px solid var(--border-dark)', color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'11px', cursor:'pointer' },
  burger: { marginLeft:'auto', display:'flex', flexDirection:'column', justifyContent:'center', gap:'5px', padding:'0 14px', background:'transparent', border:'none', borderLeft:'1px solid var(--border-dark)', cursor:'pointer', height:'100%' },
  bLine: { display:'block', width:'20px', height:'2px', background:'#D0D0D0' },
  dropdown: { position:'fixed', top:'46px', left:0, right:0, zIndex:99, background:'var(--surface-dark)', borderBottom:'2px solid var(--green)', display:'flex', flexDirection:'column', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' },
  dropLink: { padding:'14px 20px', fontFamily:'var(--font-mono)', fontSize:'13px', borderBottom:'1px solid var(--border-dark)', textDecoration:'none' },
  dropDivider: { height:'1px', background:'var(--border-dark)' },
  dropEmail: { padding:'10px 20px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis' },
  dropLogout: { padding:'12px 20px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)', textAlign:'left', cursor:'pointer' },
};

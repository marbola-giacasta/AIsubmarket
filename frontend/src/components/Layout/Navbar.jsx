import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const { pathname } = useLocation();

  return (
    <nav style={s.nav}>
      <div style={s.logo}>
        <span style={s.logoHash}>#</span>
        <span style={s.logoText}>SubMarket</span>
      </div>

      <div style={s.tabs}>
        <NavTab to="/dashboard" active={pathname === '/dashboard'}>dashboard.js</NavTab>
        <NavTab to="/purchase"  active={pathname === '/purchase'}>purchase.js</NavTab>
      </div>

      <div style={s.right}>
        <span style={s.userEmail}>{user?.email}</span>
        <button onClick={logoutUser} style={s.logoutBtn}>[ logout ]</button>
      </div>
    </nav>
  );
}

function NavTab({ to, active, children }) {
  return (
    <Link to={to} style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
      {active && <span style={s.tabBar} />}
      {children}
    </Link>
  );
}

const s = {
  nav: { display:'flex', alignItems:'stretch', height:'44px', background:'var(--surface-dark)', borderBottom:'2px solid var(--green)', position:'sticky', top:0, zIndex:100 },
  logo: { display:'flex', alignItems:'center', gap:'6px', padding:'0 20px', borderRight:'1px solid var(--border-dark)', flexShrink:0 },
  logoHash: { color:'var(--blue)', fontFamily:'var(--font-display)', fontSize:'20px' },
  logoText: { fontFamily:'var(--font-display)', fontSize:'16px', color:'#F8F8F8', letterSpacing:'1px' },
  tabs: { display:'flex', alignItems:'stretch', flex:1 },
  tab: { display:'flex', alignItems:'center', gap:'8px', padding:'0 20px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)', borderRight:'1px solid var(--border-dark)', transition:'color 0.1s', position:'relative' },
  tabActive: { color:'var(--blue)', background:'rgba(26,92,255,0.06)' },
  tabBar: { position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'var(--blue)' },
  right: { display:'flex', alignItems:'center', marginLeft:'auto', borderLeft:'1px solid var(--border-dark)' },
  userEmail: { padding:'0 14px', fontSize:'11px', color:'var(--muted)', fontFamily:'var(--font-mono)' },
  logoutBtn: { height:'100%', padding:'0 16px', background:'transparent', border:'none', borderLeft:'1px solid var(--border-dark)', color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'11px', cursor:'pointer', transition:'color 0.1s' },
};

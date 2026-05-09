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

  const tabs = [
    { to:'/dashboard', label:'dashboard.js' },
    { to:'/purchase',  label:'purchase.js' },
    { to:'/history',   label:'history.js' },
  ];

  return (
    <>
      <nav style={s.nav}>
        <div style={s.logo}>
          <span style={s.hash}>#</span>
          <span style={s.name}>{isMobile ? 'SM' : 'SubMarket'}</span>
        </div>

        {!isMobile && (
          <div style={s.tabs}>
            {tabs.map(t => (
              <Link key={t.to} to={t.to} style={{ ...s.tab, ...(pathname===t.to ? s.tabActive : {}) }}>
                {pathname===t.to && <span style={s.tabBar} />}
                {t.label}
              </Link>
            ))}
          </div>
        )}

        {!isMobile && (
          <div style={s.right}>
            <span style={s.email}>{user?.email}</span>
            <button onClick={logoutUser} style={s.logoutBtn}>[ logout ]</button>
          </div>
        )}

        {isMobile && (
          <button style={s.burger} onClick={() => setMenuOpen(o => !o)}>
            <span style={s.bLine}/><span style={s.bLine}/><span style={s.bLine}/>
          </button>
        )}
      </nav>

      {isMobile && menuOpen && (
        <div style={s.dropdown}>
          {tabs.map(t => (
            <Link key={t.to} to={t.to} onClick={() => setMenuOpen(false)} style={s.dropLink}>
              <span style={{ color: pathname===t.to ? 'var(--blue)' : 'var(--muted)' }}>
                {pathname===t.to ? '> ' : '  '}{t.label}
              </span>
            </Link>
          ))}
          <div style={s.dropDivider} />
          <div style={s.dropEmail}>{user?.email}</div>
          <button onClick={() => { logoutUser(); setMenuOpen(false); }} style={s.dropLogout}>[ logout ]</button>
        </div>
      )}
    </>
  );
}

const s = {
  nav:       { display:'flex', alignItems:'stretch', height:'44px', background:'var(--surface-dark)', borderBottom:'2px solid var(--green)', position:'sticky', top:0, zIndex:100, flexShrink:0 },
  logo:      { display:'flex', alignItems:'center', gap:'6px', padding:'0 14px', borderRight:'1px solid var(--border-dark)', flexShrink:0 },
  hash:      { color:'var(--blue)', fontFamily:'var(--font-display)', fontSize:'18px' },
  name:      { fontFamily:'var(--font-display)', fontSize:'14px', color:'#F8F8F8', letterSpacing:'1px' },
  tabs:      { display:'flex', alignItems:'stretch', flex:1 },
  tab:       { display:'flex', alignItems:'center', padding:'0 16px', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)', borderRight:'1px solid var(--border-dark)', position:'relative', whiteSpace:'nowrap', textDecoration:'none' },
  tabActive: { color:'var(--blue)', background:'rgba(26,92,255,0.06)' },
  tabBar:    { position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'var(--blue)' },
  right:     { display:'flex', alignItems:'center', marginLeft:'auto', borderLeft:'1px solid var(--border-dark)' },
  email:     { padding:'0 12px', fontSize:'11px', color:'var(--muted)', fontFamily:'var(--font-mono)', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn: { height:'100%', padding:'0 14px', background:'transparent', border:'none', borderLeft:'1px solid var(--border-dark)', color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'11px', cursor:'pointer' },
  burger:    { marginLeft:'auto', display:'flex', flexDirection:'column', justifyContent:'center', gap:'5px', padding:'0 14px', background:'transparent', border:'none', borderLeft:'1px solid var(--border-dark)', cursor:'pointer', height:'100%' },
  bLine:     { display:'block', width:'20px', height:'2px', background:'#D0D0D0' },
  dropdown:  { position:'fixed', top:'46px', left:0, right:0, zIndex:99, background:'var(--surface-dark)', borderBottom:'2px solid var(--green)', display:'flex', flexDirection:'column', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' },
  dropLink:  { padding:'14px 20px', fontFamily:'var(--font-mono)', fontSize:'13px', borderBottom:'1px solid var(--border-dark)', textDecoration:'none' },
  dropDivider:{ height:'1px', background:'var(--border-dark)' },
  dropEmail: { padding:'10px 20px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' },
  dropLogout:{ padding:'12px 20px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--muted)', textAlign:'left', cursor:'pointer' },
};

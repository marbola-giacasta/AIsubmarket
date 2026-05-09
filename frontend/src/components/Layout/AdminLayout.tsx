// @ts-nocheck
// Renamed tabs: registered.js → subdomains.js, domains.js → root_domains.js
// Added pageHeader slot for second sticky sub-header

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function AdminLayout({ children, pageHeader = null }) {
  const { user, logoutUser } = useAuth();
  const { pathname }         = useLocation();
  const isMobile             = useIsMobile(768);
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { to:'/admin',              label:'requests.js' },
    { to:'/admin/subdomains',   label:'subdomains.js' },   // was registered.js
    { to:'/admin/root-domains', label:'root_domains.js' }, // was domains.js
    { to:'/admin/users',        label:'users.js' },
    { to:'/admin/history',      label:'history.js' },
  ];

  return (
    <div style={s.shell}>
      {/* 1st sticky — admin top bar */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <span style={s.adminBadge}>ADMIN</span>
          <span style={s.siteName}># SubMarket</span>
        </div>
        {!isMobile && (
          <div style={s.nav}>
            {tabs.map(t => (
              <Link key={t.to} to={t.to} style={{ ...s.navLink, ...(pathname===t.to ? s.navLinkActive : {}) }}>
                {pathname===t.to && <span style={s.navDot} />}{t.label}
              </Link>
            ))}
          </div>
        )}
        <div style={s.topRight}>
          {!isMobile && <span style={s.adminEmail}>{user?.email}</span>}
          <button onClick={logoutUser} style={s.logoutBtn}>[ logout ]</button>
          {isMobile && (
            <button style={s.burger} onClick={() => setMenuOpen(o => !o)}>
              <span style={s.bLine}/><span style={s.bLine}/><span style={s.bLine}/>
            </button>
          )}
        </div>
      </div>

      {isMobile && menuOpen && (
        <div style={s.dropdown}>
          {tabs.map(t => (
            <Link key={t.to} to={t.to} onClick={() => setMenuOpen(false)} style={s.dropLink}>
              <span style={{ color: pathname===t.to ? 'var(--gold)' : 'var(--muted)' }}>
                {pathname===t.to ? '> ' : '  '}{t.label}
              </span>
            </Link>
          ))}
          <div style={{ padding:'10px 20px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)' }}>{user?.email}</div>
        </div>
      )}

      {/* Gold accent */}
      <div style={s.accentBar} />

      {/* 2nd sticky — page title + action */}
      {pageHeader && <div style={s.pageHeader}>{pageHeader}</div>}

      {/* Scrollable content */}
      <div style={s.contentRow}>
        <main style={s.main}>{children}</main>
      </div>

      {/* Status bar */}
      <div style={s.statusBar}>
        <span style={s.si}>SubMarket Admin</span>
        {!isMobile && <span style={s.si}>{user?.email}</span>}
        <span style={{ ...s.si, marginLeft:'auto' }}>v1.0</span>
      </div>
    </div>
  );
}

const s = {
  shell:        { height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' },
  topBar:       { display:'flex', alignItems:'stretch', height:'48px', background:'var(--surface-dark)', borderBottom:'1px solid var(--border-dark)', flexShrink:0 },
  topLeft:      { display:'flex', alignItems:'center', gap:'10px', padding:'0 14px', borderRight:'1px solid var(--border-dark)', flexShrink:0 },
  adminBadge:   { fontFamily:'var(--font-display)', fontSize:'10px', letterSpacing:'2px', background:'var(--gold)', color:'#0A0A0A', padding:'2px 8px' },
  siteName:     { fontFamily:'var(--font-display)', fontSize:'13px', color:'#F8F8F8', letterSpacing:'1px' },
  nav:          { display:'flex', alignItems:'stretch', flex:1, overflow:'hidden' },
  navLink:      { display:'flex', alignItems:'center', gap:'6px', padding:'0 11px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', borderRight:'1px solid var(--border-dark)', textDecoration:'none', whiteSpace:'nowrap' },
  navLinkActive:{ color:'var(--gold)', background:'rgba(201,147,42,0.06)' },
  navDot:       { width:'5px', height:'5px', background:'var(--gold)', display:'inline-block', flexShrink:0 },
  topRight:     { display:'flex', alignItems:'center', marginLeft:'auto', borderLeft:'1px solid var(--border-dark)' },
  adminEmail:   { padding:'0 12px', fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--muted)', maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn:    { height:'100%', padding:'0 14px', background:'transparent', border:'none', borderLeft:'1px solid var(--border-dark)', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'11px', cursor:'pointer' },
  burger:       { height:'100%', padding:'0 14px', display:'flex', flexDirection:'column', justifyContent:'center', gap:'5px', background:'transparent', border:'none', borderLeft:'1px solid var(--border-dark)', cursor:'pointer' },
  bLine:        { display:'block', width:'18px', height:'2px', background:'var(--muted)' },
  dropdown:     { position:'fixed', top:'49px', left:0, right:0, zIndex:99, background:'var(--surface-dark)', borderBottom:'2px solid var(--gold)', display:'flex', flexDirection:'column', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' },
  dropLink:     { padding:'14px 20px', fontFamily:'var(--font-mono)', fontSize:'13px', borderBottom:'1px solid var(--border-dark)', textDecoration:'none' },
  accentBar:    { height:'3px', background:'var(--gold)', flexShrink:0 },
  pageHeader:   { flexShrink:0, background:'var(--surface-dark)', borderBottom:'1px solid var(--border-dark)', padding:'10px clamp(16px,4vw,40px)' },
  contentRow:   { display:'flex', flex:1, minHeight:0, overflow:'hidden' },
  main:         { flex:1, minWidth:0, overflowY:'auto', padding:'clamp(16px,4vw,28px) clamp(16px,4vw,40px)', maxWidth:'1200px', width:'100%', margin:'0 auto' },
  statusBar:    { display:'flex', alignItems:'center', height:'22px', background:'var(--gold)', flexShrink:0 },
  si:           { padding:'0 10px', fontSize:'11px', color:'#0A0A0A', fontFamily:'var(--font-display)', borderRight:'1px solid rgba(0,0,0,0.15)', letterSpacing:'0.5px', whiteSpace:'nowrap' },
};

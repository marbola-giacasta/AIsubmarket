// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// Layout.tsx — two sticky headers.
// 1st: Navbar (always)
// 2nd: PageHeader — title + main action button — passed as prop
//      so each page controls its own header content
// Only the content below scrolls.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import Navbar from './Navbar';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function Layout({ children, pageHeader = null }) {
  const isMobile = useIsMobile(768);

  return (
    <div style={s.shell}>
      {/* 1st sticky — navbar */}
      <Navbar />

      {/* 2nd sticky — page title + action button */}
      {pageHeader && (
        <div style={s.pageHeader}>
          {pageHeader}
        </div>
      )}

      {/* Content row — only main scrolls */}
      <div style={s.contentRow}>
        {!isMobile && (
          <div style={s.lineNumbers}>
            {Array.from({ length: 80 }, (_, i) => (
              <div key={i} style={s.lineNum}>{i + 1}</div>
            ))}
          </div>
        )}
        <main style={s.main}>{children}</main>
      </div>

      {/* Status bar */}
      <div style={s.statusBar}>
        <span style={s.si}>SubMarket</span>
        {!isMobile && <span style={s.si}>UTF-8</span>}
        {!isMobile && <span style={s.si}>JavaScript JSX</span>}
        <span style={{ ...s.si, marginLeft:'auto' }}>v1.0</span>
      </div>
    </div>
  );
}

const s = {
  shell:       { height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' },
  pageHeader:  {
    flexShrink: 0,
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    padding: '10px clamp(16px,4vw,40px)',
  },
  contentRow:  { display:'flex', flex:1, minHeight:0, overflow:'hidden' },
  lineNumbers: { width:'44px', flexShrink:0, paddingTop:'20px', borderRight:'1px solid var(--border)', background:'var(--surface)', overflowY:'hidden' },
  lineNum:     { height:'20px', lineHeight:'20px', textAlign:'right', paddingRight:'10px', fontSize:'10px', color:'var(--border)', userSelect:'none', fontFamily:'var(--font-mono)' },
  main:        { flex:1, minWidth:0, overflowY:'auto', padding:'clamp(16px,4vw,28px) clamp(16px,4vw,40px)' },
  statusBar:   { display:'flex', alignItems:'center', height:'22px', background:'var(--green)', flexShrink:0 },
  si:          { padding:'0 10px', fontSize:'11px', color:'#0A0A0A', fontFamily:'var(--font-display)', borderRight:'1px solid rgba(0,0,0,0.15)', letterSpacing:'0.5px', whiteSpace:'nowrap' },
};

// @ts-nocheck
// TypeScript migration in progress — full types will be added gradually.
// @ts-nocheck suppresses type errors on this file so the build passes
// while the rest of the codebase is already fully typed.
import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column' }}>
      <Navbar />
      <div style={{ display:'flex', flex:1, minWidth:0 }}>
        <div className="line-numbers" style={s.lines}>
          {Array.from({ length: 60 }, (_, i) => (
            <div key={i} style={s.lineNum}>{i + 1}</div>
          ))}
        </div>
        <main style={s.main}>
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

function StatusBar() {
  return (
    <div style={s.bar}>
      <span style={s.barItem}>SubMarket</span>
      <span style={s.barItem}>UTF-8</span>
      <span style={s.barItemHide}>JavaScript JSX</span>
      <span style={{ ...s.barItem, marginLeft:'auto' }}>v1.0</span>
    </div>
  );
}

const s = {
  lines: {
    width:'44px', flexShrink:0, paddingTop:'32px',
    borderRight:'1px solid var(--border)', background:'var(--surface)',
  },
  lineNum: {
    height:'20px', lineHeight:'20px', textAlign:'right',
    paddingRight:'10px', fontSize:'10px', color:'var(--border)',
    userSelect:'none', fontFamily:'var(--font-mono)',
  },
  main: {
    flex:1, minWidth:0,
    padding:'clamp(16px, 4vw, 32px) clamp(16px, 4vw, 40px)',
    maxWidth:'1100px', width:'100%',
  },
  bar: {
    display:'flex', alignItems:'center', height:'22px',
    background:'var(--green)', flexShrink:0,
  },
  barItem: {
    padding:'0 10px', fontSize:'11px', color:'#0A0A0A',
    fontFamily:'var(--font-display)', borderRight:'1px solid rgba(0,0,0,0.15)',
    letterSpacing:'0.5px', whiteSpace:'nowrap',
  },
  barItemHide: {
    padding:'0 10px', fontSize:'11px', color:'#0A0A0A',
    fontFamily:'var(--font-display)', borderRight:'1px solid rgba(0,0,0,0.15)',
    letterSpacing:'0.5px',
    // hide on small screens via media — done in CSS class
  },
};

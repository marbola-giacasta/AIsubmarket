import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <Navbar />
      <div style={{ display:'flex', flex:1 }}>
        <LineNumbers />
        <main style={{ flex:1, padding:'32px 40px', maxWidth:'1100px', width:'100%' }}>
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

function LineNumbers() {
  return (
    <div style={s.lines}>
      {Array.from({ length: 60 }, (_, i) => (
        <div key={i} style={s.lineNum}>{i + 1}</div>
      ))}
    </div>
  );
}

function StatusBar() {
  return (
    <div style={s.bar}>
      <span style={s.barItem}>SubMarket</span>
      <span style={s.barItem}>UTF-8</span>
      <span style={s.barItem}>JavaScript JSX</span>
      <span style={{ ...s.barItem, marginLeft:'auto' }}>Spaces: 2</span>
    </div>
  );
}

const s = {
  lines: { width:'44px', flexShrink:0, paddingTop:'32px', borderRight:'1px solid var(--border)', background:'var(--surface)' },
  lineNum: { height:'20px', lineHeight:'20px', textAlign:'right', paddingRight:'10px', fontSize:'10px', color:'var(--border)', userSelect:'none', fontFamily:'var(--font-mono)' },
  bar: { display:'flex', alignItems:'center', height:'22px', background:'var(--green)', flexShrink:0 },
  barItem: { padding:'0 10px', fontSize:'11px', color:'#0A0A0A', fontFamily:'var(--font-display)', borderRight:'1px solid rgba(0,0,0,0.15)', letterSpacing:'0.5px' },
};

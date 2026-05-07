import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../../services/api';
import SubdomainCard from './SubdomainCard';
import DNSManager from './DNSManager';
import { useAuth } from '../../contexts/AuthContext';
import Btn from '../UI/Btn';

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subdomains, setSubdomains] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [error,      setError]      = useState('');
  const [stripeMsg,  setStripeMsg]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { subdomains } = await api.getSubdomains(); setSubdomains(subdomains); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const stripeStatus = searchParams.get('stripe');
    const sessionId    = searchParams.get('session_id');
    const sub          = searchParams.get('subdomain');
    const dom          = searchParams.get('domain');
    if (stripeStatus === 'success' && sessionId) {
      api.confirmStripePayment(sessionId)
        .then(() => { setStripeMsg(`${sub}.${dom}`); load(); setSearchParams({}); })
        .catch(err => { setError(err.message); setSearchParams({}); });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm('Release this subdomain?')) return;
    try { await api.deleteSubdomain(id); setSubdomains(prev => prev.filter(t => t.id !== id)); }
    catch (err) { alert(err.message); }
  }

  if (loading) return (
    <div style={{ padding:'20px', fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:'12px' }}>
      <span style={{ color:'var(--comment)' }}>// </span>loading<span className="cursor" />
    </div>
  );

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.breadcrumb}>
            <span style={s.bc}># submarket</span>
            <span style={s.bcsep}> &gt; </span>
            <span style={{ ...s.bc, color:'var(--blue)' }}>dashboard</span>
            <span style={s.bcsep}> &gt; </span>
            <span style={{ ...s.bc, color:'var(--gold)' }}>{user?.email?.split('@')[0]}</span>
            <span style={s.bccount}>[{subdomains.length}]</span>
          </div>
          <h1 style={s.title}>MY DOMAINS</h1>
        </div>
        <Link to="/purchase">
          <Btn variant="blue">+ NEW DOMAIN</Btn>
        </Link>
      </div>

      {stripeMsg && <div style={s.ok}>OK -- payment confirmed -- <strong>{stripeMsg}</strong> registered</div>}
      {error     && <div style={s.err}>ERR -- {error}</div>}

      {subdomains.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyCode}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', lineHeight:2.2 }}>
              <span style={{ color:'var(--green)' }}>const </span>
              <span style={{ color:'var(--gold)' }}>myDomains</span>
              <span style={{ color:'var(--muted)' }}> = </span>
              <span style={{ color:'var(--orange)' }}>[]</span>
            </div>
            <div style={{ fontFamily:'var(--font-mono)', color:'var(--comment)', fontSize:'12px' }}>// no subdomains registered yet</div>
          </div>
          <Link to="/purchase"><Btn variant="primary"><Btn variant="primary">&#9658; PURCHASE FIRST DOMAIN</Btn>#9658; PURCHASE FIRST DOMAIN</Btn></Link>
        </div>
      ) : (
        <div style={s.grid}>
          {subdomains.map((tag, i) => (
            <div key={tag.id} className={`fade-up delay-${Math.min(i+1,3)}`}>
              <SubdomainCard tag={tag} onConfigureDNS={setSelected} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      {/* JSDoc info */}
      <div style={s.docs}>
        <div style={s.docsHeader}>/**</div>
        {[
          ['@hosting',   'Vercel, Netlify, GitHub Pages, Wix, Squarespace, VPS'],
          ['@dns',       'A, CNAME, MX, TXT, AAAA record types supported'],
          ['@cdn',       'Cloudflare proxy -- DDoS protection + auto HTTPS'],
          ['@api',       'REST API available for programmatic DNS updates'],
        ].map(([key, val]) => (
          <div key={key} style={s.docsLine}>
            <span style={{ color:'var(--comment)' }}>  * </span>
            <span style={{ color:'var(--gold)', fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'0.5px' }}>{key}</span>
            <span style={{ color:'var(--muted)' }}> -- </span>
            <span style={{ color:'var(--text)' }}>{val}</span>
          </div>
        ))}
        <div style={s.docsFooter}>*/</div>
      </div>

      {selected && (
        <DNSManager tag={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load(); }} />
      )}
    </div>
  );
}

const s = {
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'24px', flexWrap:'wrap', gap:'16px' },
  breadcrumb: { display:'flex', alignItems:'center', fontFamily:'var(--font-mono)', fontSize:'11px', marginBottom:'6px' },
  bc: { color:'var(--muted)' },
  bcsep: { color:'var(--border)', padding:'0 5px' },
  bccount: { color:'var(--comment)', marginLeft:'8px' },
  title: { fontFamily:'var(--font-display)', fontSize:'36px', letterSpacing:'2px', color:'var(--text)' },

  ok: { padding:'8px 14px', background:'rgba(58,255,110,0.08)', border:'1px solid var(--green)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--teal)', marginBottom:'16px' },
  err: { padding:'8px 14px', background:'rgba(192,57,43,0.07)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },

  empty: { padding:'40px 24px', border:'1px dashed var(--border)', marginBottom:'32px', display:'flex', flexDirection:'column', gap:'20px', background:'var(--surface)' },
  emptyCode: { display:'flex', flexDirection:'column', gap:'4px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'1px', marginBottom:'40px', background:'var(--border)' },

  docs: { border:'1px solid var(--border)', background:'var(--surface)', fontFamily:'var(--font-mono)', fontSize:'12px' },
  docsHeader: { padding:'10px 14px 4px', color:'var(--comment)' },
  docsLine: { padding:'2px 14px', lineHeight:2 },
  docsFooter: { padding:'4px 14px 12px', color:'var(--comment)' },
};

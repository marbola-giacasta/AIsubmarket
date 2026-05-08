// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../../services/api';
import SubdomainCard from './SubdomainCard';
import DNSManager from './DNSManager';
import { useAuth } from '../../contexts/AuthContext';
import Btn from '../UI/Btn';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile(640);
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
      // loading<span className="cursor" />
    </div>
  );

  return (
    <div className="fade-up">
      {/* Header — stacks on mobile */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', fontFamily:'var(--font-mono)', fontSize:'11px', marginBottom:'6px', flexWrap:'wrap', gap:'0' }}>
            <span style={{ color:'var(--muted)' }}># submarket</span>
            <span style={{ color:'var(--border)', padding:'0 5px' }}> &gt; </span>
            <span style={{ color:'var(--blue)' }}>dashboard</span>
            <span style={{ color:'var(--border)', padding:'0 5px' }}> &gt; </span>
            <span style={{ color:'var(--gold)' }}>{user?.email?.split('@')[0]}</span>
            <span style={{ color:'var(--comment)', marginLeft:'8px' }}>[{subdomains.length}]</span>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize: isMobile ? '26px' : '36px', letterSpacing:'2px' }}>MY DOMAINS</h1>
        </div>
        <Link to="/purchase">
          <Btn variant="blue">+ NEW DOMAIN</Btn>
        </Link>
      </div>

      {stripeMsg && <div style={s.ok}>OK -- payment confirmed -- <strong>{stripeMsg}</strong> registered</div>}
      {error     && <div style={s.err}>ERR -- {error}</div>}

      {subdomains.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', lineHeight:2.2, marginBottom:'16px' }}>
            <span style={{ color:'var(--blue)' }}>const </span>
            <span style={{ color:'var(--gold)' }}>myDomains</span>
            <span style={{ color:'var(--muted)' }}> = </span>
            <span style={{ color:'var(--orange)' }}>[]</span>
            <br />
            <span style={{ color:'var(--comment)', fontSize:'12px' }}>// no subdomains registered yet</span>
          </div>
          <Link to="/purchase"><Btn variant="primary">&#9658; PURCHASE FIRST DOMAIN</Btn></Link>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'1px', marginBottom:'40px', background:'var(--border)' }}>
          {subdomains.map((tag, i) => (
            <div key={tag.id} className={`fade-up delay-${Math.min(i+1,3)}`}>
              <SubdomainCard tag={tag} onConfigureDNS={setSelected} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      <div style={s.docs}>
        <div style={{ color:'var(--comment)', padding:'10px 12px 4px', fontSize:'12px' }}>/**</div>
        {[
          ['@hosting',   'Vercel, Netlify, GitHub Pages, Wix, Squarespace, VPS'],
          ['@dns',       'A, CNAME, MX, TXT, AAAA record types'],
          ['@cdn',       'Cloudflare proxy -- DDoS protection + auto HTTPS'],
          ['@api',       'REST API for programmatic DNS updates'],
        ].map(([key, val]) => (
          <div key={key} style={{ padding:'2px 12px', fontSize:'12px', lineHeight:2, fontFamily:'var(--font-mono)', flexWrap:'wrap' }}>
            <span style={{ color:'var(--comment)' }}>  * </span>
            <span style={{ color:'var(--gold)', fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'0.5px' }}>{key}</span>
            <span style={{ color:'var(--muted)' }}> -- </span>
            <span style={{ color:'var(--text-2, #3C3C3C)' }}>{val}</span>
          </div>
        ))}
        <div style={{ color:'var(--comment)', padding:'4px 12px 12px', fontSize:'12px', fontFamily:'var(--font-mono)' }}>*/</div>
      </div>

      {selected && (
        <DNSManager tag={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load(); }} />
      )}
    </div>
  );
}

const s = {
  ok:   { padding:'8px 14px', background:'rgba(58,255,110,0.08)', border:'1px solid var(--green)', fontFamily:'var(--font-mono)', fontSize:'12px', marginBottom:'16px' },
  err:  { padding:'8px 14px', background:'rgba(192,57,43,0.07)', border:'1px solid var(--red)', fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--red)', marginBottom:'16px' },
  empty:{ padding:'28px 20px', border:'1px dashed var(--border)', marginBottom:'32px', display:'flex', flexDirection:'column', gap:'12px', background:'var(--surface)' },
  docs: { border:'1px solid var(--border)', background:'var(--surface)' },
};

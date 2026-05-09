// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminDomains.tsx — all registered subdomains with full status.
// Shows actual data by fetching ALL tags regardless of state.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

const BASE = (import.meta.env.VITE_API_URL||'')+'/api';
function authH(){ return {'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`}; }
async function req(method,path){
  const res=await fetch(`${BASE}${path}`,{method,headers:authH()});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||'Failed');
  return data;
}

const DNS_COLOR={A:'var(--teal)',CNAME:'var(--blue)',MX:'var(--gold)',TXT:'var(--orange)',AAAA:'var(--muted)'};

function getHealth(tag){
  if(tag.subscription_cancelled){
    return {label:'CANCELLED',color:'var(--muted)',icon:'∅',
      note: tag.subscription_cancel_date
        ? `Renewal cancelled ${new Date(tag.subscription_cancel_date).toLocaleDateString('en-GB')}`
        : 'Renewal cancelled'};
  }
  if(tag.dns_type&&tag.dns_value){
    return {label:'LIVE',color:'var(--comment)',icon:'✓',
      note:`${tag.dns_type} → ${tag.dns_value}${tag.dns_updated_at?' (updated '+new Date(tag.dns_updated_at).toLocaleDateString('en-GB')+')':''}`};
  }
  if(!tag.dns_type&&tag.dns_updated_at){
    return {label:'DNS REMOVED',color:'var(--orange)',icon:'⚠',
      note:`DNS was deleted on ${new Date(tag.dns_updated_at).toLocaleDateString('en-GB')} — subscription still active`};
  }
  return {label:'NO DNS',color:'var(--red)',icon:'✗',
    note:'Subdomain registered but DNS not configured yet'};
}

function fmtPrice(usd,chf,eur){ const p=[]; if(usd)p.push(`$${usd}`); if(chf)p.push(`${chf}CHF`); if(eur)p.push(`${eur}EUR`); return p.length?p.join('/')+'/mo':null; }

export default function AdminDomains(){
  const [subdomains,setSubdomains]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const isMobile=useIsMobile(640);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const { subdomains }=await req('GET','/admin/subdomains');
      setSubdomains(subdomains||[]);
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{load();},[load]);

  const filtered=subdomains.filter(tag=>{
    const h=getHealth(tag);
    const ms=tag.fqdn.toLowerCase().includes(search.toLowerCase())||(tag.owner_email||'').toLowerCase().includes(search.toLowerCase());
    const mf=filter==='all'||
      (filter==='live'&&h.label==='LIVE')||
      (filter==='nodns'&&(h.label==='NO DNS'||h.label==='DNS REMOVED'))||
      (filter==='cancelled'&&h.label==='CANCELLED');
    return ms&&mf;
  });

  const counts=subdomains.reduce((a,t)=>{const h=getHealth(t).label;a[h]=(a[h]||0)+1;return a;},{});

  if(loading) return <div style={s.loading}>// loading subdomains<span className="cursor"/></div>;

  return (
    <div className="fade-up">
      {error&&<div style={s.err}>ERR -- {error}</div>}

      {/* Stats — clickable filters */}
      <div style={s.statsRow}>
        {[
          {f:'all',l:'TOTAL',  v:subdomains.length,c:'var(--muted)'},
          {f:'live',l:'LIVE',  v:counts['LIVE']||0,c:'var(--comment)'},
          {f:'nodns',l:'NO DNS',v:(counts['NO DNS']||0)+(counts['DNS REMOVED']||0),c:'var(--red)'},
          {f:'cancelled',l:'CANCELLED',v:counts['CANCELLED']||0,c:'var(--muted)'},
        ].map(({f,l,v,c})=>(
          <button key={f} onClick={()=>setFilter(f)} style={{...s.statBtn,borderColor:filter===f?c:'var(--border)',background:filter===f?'var(--surface-dark)':'var(--surface)'}}>
            <span style={{fontFamily:'var(--font-display)',fontSize:'22px',color:c,lineHeight:1}}>{v}</span>
            <span style={{fontFamily:'var(--font-display)',fontSize:'9px',color:filter===f?c:'var(--muted)',letterSpacing:'1px'}}>{l}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={s.searchRow}>
        <span style={s.searchPfx}>// filter:</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="search fqdn or email..." style={s.searchInput}/>
        {search&&<button onClick={()=>setSearch('')} style={s.clearBtn}>[ clear ]</button>}
      </div>

      {filtered.length===0&&<div style={s.empty}>// no results{error?' — '+error:''}</div>}

      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(320px,1fr))',gap:'8px'}}>
        {filtered.map(tag=>{
          const h=getHealth(tag);
          const price=fmtPrice(tag.price_usd,tag.price_chf,tag.price_eur);
          return (
            <div key={tag.id} style={{...s.card,borderLeftColor:h.color}}>
              <div style={s.cardHead}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',minWidth:0}}>
                  <span style={{color:h.color,fontFamily:'var(--font-mono)',fontSize:'14px',flexShrink:0}}>{h.icon}</span>
                  <span style={s.fqdn}>{tag.fqdn}</span>
                </div>
                <span style={{fontFamily:'var(--font-display)',fontSize:'9px',padding:'2px 7px',background:h.color,color:h.label==='LIVE'?'#F8F8F8':'#F8F8F8',letterSpacing:'1px',flexShrink:0}}>
                  {h.label}
                </span>
              </div>
              <div style={s.cardBody}>
                <Row k="owner"   v={tag.owner_email||'—'}/>
                <Row k="status"  v={h.note} muted/>

                {/* DNS details */}
                {tag.dns_type&&tag.dns_value&&(
                  <div style={s.dnsBlock}>
                    <span style={{...s.dnsType,color:DNS_COLOR[tag.dns_type]||'var(--muted)',borderColor:DNS_COLOR[tag.dns_type]||'var(--muted)'}}>{tag.dns_type}</span>
                    <span style={{fontFamily:'var(--font-mono)',color:'var(--muted)',fontSize:'11px'}}>→</span>
                    <span style={{fontFamily:'var(--font-mono)',color:'var(--orange)',fontSize:'11px',wordBreak:'break-all'}}>{tag.dns_value}</span>
                    {!!tag.dns_proxied&&<span style={s.proxy}>CF PROXY</span>}
                  </div>
                )}

                {/* Price / subscription */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'4px'}}>
                  {price
                    ?<span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--blue)'}}>$ {price}</span>
                    :<span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--muted)'}}>// no price set</span>
                  }
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--muted)'}}>
                    reg {new Date(tag.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({k,v,muted=false}){
  return(
    <div style={{display:'flex',alignItems:'flex-start',gap:'0',fontSize:'11px'}}>
      <span style={{fontFamily:'var(--font-display)',color:'var(--gold)',minWidth:'60px',fontSize:'10px',letterSpacing:'0.3px',flexShrink:0}}>{k}</span>
      <span style={{fontFamily:'var(--font-mono)',color:'var(--muted)',padding:'0 6px',flexShrink:0}}>=</span>
      <span style={{fontFamily:'var(--font-mono)',color:muted?'var(--muted)':'var(--text)',wordBreak:'break-all',lineHeight:1.4,fontStyle:muted?'italic':'normal'}}>{v}</span>
    </div>
  );
}

const s={
  loading:{fontFamily:'var(--font-mono)',color:'var(--muted)',fontSize:'13px',padding:'20px 0'},
  err:{padding:'8px 14px',background:'rgba(192,57,43,0.08)',border:'1px solid var(--red)',fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--red)',marginBottom:'16px'},
  statsRow:{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'16px'},
  statBtn:{display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 16px',border:'1px solid',cursor:'pointer',gap:'2px',transition:'all 0.1s'},
  searchRow:{display:'flex',alignItems:'center',marginBottom:'16px',background:'var(--surface)',border:'1px solid var(--border)'},
  searchPfx:{fontFamily:'var(--font-mono)',color:'var(--comment)',fontSize:'12px',padding:'8px 12px',borderRight:'1px solid var(--border)',whiteSpace:'nowrap'},
  searchInput:{flex:1,padding:'8px 12px',background:'transparent',border:'none',fontFamily:'var(--font-mono)',color:'var(--text)',fontSize:'13px',outline:'none'},
  clearBtn:{padding:'8px 12px',background:'transparent',border:'none',borderLeft:'1px solid var(--border)',fontFamily:'var(--font-mono)',color:'var(--muted)',fontSize:'11px',cursor:'pointer'},
  empty:{fontFamily:'var(--font-mono)',color:'var(--comment)',fontSize:'12px',padding:'20px',border:'1px dashed var(--border)',background:'var(--surface)'},
  card:{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--muted)',display:'flex',flexDirection:'column'},
  cardHead:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'var(--bg-2)',borderBottom:'1px solid var(--border)',gap:'8px'},
  fqdn:{fontFamily:'var(--font-display)',fontSize:'13px',color:'var(--text)',letterSpacing:'0.3px',wordBreak:'break-all'},
  cardBody:{padding:'10px 12px',display:'flex',flexDirection:'column',gap:'6px'},
  dnsBlock:{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',padding:'5px 8px',background:'var(--bg)',border:'1px solid var(--border)'},
  dnsType:{fontFamily:'var(--font-display)',fontSize:'9px',border:'1px solid',padding:'1px 5px',letterSpacing:'0.5px',flexShrink:0},
  proxy:{fontFamily:'var(--font-display)',fontSize:'9px',color:'var(--teal)',border:'1px solid var(--teal)',padding:'1px 5px',letterSpacing:'0.5px',flexShrink:0},
};

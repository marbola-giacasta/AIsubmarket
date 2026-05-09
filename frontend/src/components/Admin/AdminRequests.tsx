// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// AdminRequests.tsx — approved cards now show a full status
// panel with DNS state, renewal state and timestamps.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import Btn from '../UI/Btn';
import MessageCarousel from '../UI/MessageCarousel';

const BASE = (import.meta.env.VITE_API_URL||'')+'/api';
function authH(){ return {'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`}; }
async function req(method,path,body=null){
  const res=await fetch(`${BASE}${path}`,{method,headers:authH(),body:body?JSON.stringify(body):undefined});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||'Request failed');
  return data;
}
async function sendAdminMessage(requestId,text){ return (await req('POST',`/admin/requests/${requestId}/message`,{text})).messages; }
function buildMessages(r){ const msgs=Array.isArray(r.messages)?[...r.messages]:[]; if(msgs.length===0&&r.admin_comment) msgs.unshift({id:'legacy',sender:'admin',text:r.admin_comment,sent_at:r.created_at}); return msgs; }
function fmt(iso){ return iso ? new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : null; }
function fmtPrice(usd,chf,eur){ const p=[]; if(usd)p.push(`$${usd}`); if(chf)p.push(`${chf}CHF`); if(eur)p.push(`${eur}EUR`); return p.length?p.join('/')+'/mo':null; }

export default function AdminRequests() {
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState('');
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);
    try{const{requests}=await req('GET','/admin/requests');setRequests(requests);}
    catch(err){setError(err.message);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{load();},[load]);

  async function handle(fn,...args){setMsg('');setError('');try{const r=await fn(...args);setMsg(r.message||'Done');load();}catch(err){setError(err.message);}}

  const pending  = requests.filter(r=>r.status==='pending');
  const resolved = requests.filter(r=>r.status!=='pending');

  if(loading) return <div style={s.loading}>// loading<span className="cursor"/></div>;

  return (
    <div className="fade-up">
      <div style={s.statsRow}>
        <Stat label="PENDING"  value={pending.length}  color="var(--gold)"/>
        <Stat label="RESOLVED" value={resolved.length} color="var(--comment)"/>
      </div>
      {msg   && <div style={s.ok}>OK -- {msg}</div>}
      {error && <div style={s.err}>ERR -- {error}</div>}

      <SectionHead label="PENDING" count={pending.length}/>
      {pending.length===0
        ? <div style={s.empty}>// no pending requests</div>
        : <div style={s.grid}>{pending.map(r=><RequestCard key={r.id} request={r} handle={handle} onArchive={id=>handle(()=>req('POST',`/admin/requests/${id}/archive`),)} onRefresh={load}/>)}</div>
      }
      {resolved.length>0&&(
        <>
          <SectionHead label="RESOLVED — × to archive" count={resolved.length} top/>
          <div style={s.grid}>{resolved.map(r=><RequestCard key={r.id} request={r} resolved handle={handle} onArchive={id=>req('POST',`/admin/requests/${id}/archive`).then(load)} onRefresh={load}/>)}</div>
        </>
      )}
    </div>
  );
}

function RequestCard({request:r,handle,onArchive,resolved=false,onRefresh}){
  const [tab,setTab]=useState('chat');
  const [note,setNote]=useState('');
  const [pu,setPu]=useState('');
  const [pc,setPc]=useState('');
  const [pe,setPe]=useState('');

  const sc=r.status==='approved'?'var(--comment)':r.status==='rejected'?'var(--red)':'var(--gold)';
  const pl=r.price_status==='proposed'?'PRICE SENT':r.price_status==='accepted'?'ACCEPTED':r.price_status==='declined'?'DECLINED':null;
  const messages=buildMessages(r);
  const price=fmtPrice(r.price_usd,r.price_chf,r.price_eur);

  return (
    <div style={{...s.card,borderTopColor:sc}}>
      {/* Header */}
      <div style={s.cardHead}>
        <span style={s.fqdn}>{r.fqdn}</span>
        <div style={{display:'flex',gap:'5px',alignItems:'center',flexWrap:'wrap'}}>
          {pl&&<Tag label={pl} color="var(--blue)" bg="rgba(26,92,255,0.12)"/>}
          <Tag label={r.status.toUpperCase()} color={r.status==='pending'?'#0A0A0A':'#F8F8F8'} bg={sc}/>
          {resolved&&<button onClick={()=>onArchive(r.id)} style={s.archiveBtn}>×</button>}
        </div>
      </div>

      <div style={s.cardBody}>
        {/* Request details */}
        <Row k="name"      v={r.name}/>
        <Row k="email"     v={r.requester_email}/>
        <Row k="use_case"  v={r.use_case}/>
        {r.message&&<Row k="message" v={r.message}/>}
        <Row k="submitted" v={fmt(r.created_at)}/>

        {/* Price */}
        {price&&(
          <div style={s.infoPanel}>
            <span style={s.panelLabel}>// PRICE</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--blue)'}}>{price}</span>
            {r.price_status==='accepted'&&<span style={s.ok2}>✓ accepted by user</span>}
            {r.price_status==='declined'&&<span style={s.bad}>✗ declined by user</span>}
          </div>
        )}

        {/* Approved card: full tag status panel */}
        {r.status==='approved'&&(
          <div style={{...s.infoPanel,borderColor:r.tag_cancelled?'var(--muted)':r.tag_has_dns?'var(--comment)':'var(--red)'}}>
            <span style={s.panelLabel}>// SUBSCRIPTION & DNS STATUS</span>

            {/* Does the tag still exist? */}
            {!r.tag_exists&&(
              <StatusLine icon="∅" color="var(--muted)" label="Tag deleted" sub="User cancelled before history tracking was enabled"/>
            )}

            {r.tag_exists&&(
              <>
                {/* Renewal status */}
                {r.tag_cancelled?(
                  <StatusLine icon="✗" color="var(--orange)" label="Renewal cancelled"
                    sub={r.tag_cancel_date?`Cancelled on ${fmt(r.tag_cancel_date)}`:'Cancellation date unknown'}/>
                ):(
                  <StatusLine icon="✓" color="var(--comment)" label="Renewal active" sub="Subscription is running"/>
                )}

                {/* DNS status */}
                {r.tag_has_dns?(
                  <StatusLine icon="◉" color="var(--teal)" label={`DNS: ${r.tag_dns_type} → ${r.tag_dns_value}`}
                    sub={r.tag_dns_updated_at?`Last updated ${fmt(r.tag_dns_updated_at)}`:null}/>
                ):r.tag_dns_updated_at?(
                  <StatusLine icon="⚠" color="var(--orange)" label="DNS was removed"
                    sub={`Last seen ${fmt(r.tag_dns_updated_at)} — subscription still active`}/>
                ):(
                  <StatusLine icon="✗" color="var(--red)" label="No DNS configured"
                    sub="User has not set up DNS yet"/>
                )}
              </>
            )}
          </div>
        )}

        {r.admin_note&&<div style={s.infoPanel}><span style={s.panelLabel}>// decision note</span><span style={{fontFamily:'var(--font-mono)',fontSize:'12px',lineHeight:1.5}}>{r.admin_note}</span></div>}

        <MessageCarousel requestId={r.id} initialMessages={messages} isAdmin={true} onSend={sendAdminMessage} pollInterval={15000}/>
      </div>

      {/* Action area — pending only */}
      {!resolved&&(
        <div style={s.actionArea}>
          <div style={s.tabRow}>
            {[['chat','MESSAGE'],['price','PROPOSE PRICE'],['decide','APPROVE / REJECT']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{...s.actionTab,...(tab===t?s.actionTabActive:{})}}>{l}</button>
            ))}
          </div>
          {tab==='price'&&(
            <div style={s.tabContent}>
              <span style={s.tabHint}>// fill at least one currency</span>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                <PriceField label="USD $" value={pu} onChange={setPu}/>
                <PriceField label="CHF"   value={pc} onChange={setPc}/>
                <PriceField label="EUR €" value={pe} onChange={setPe}/>
              </div>
              <div style={s.tabBtns}>
                <Btn variant="gold" onClick={()=>handle(()=>req('POST',`/admin/requests/${r.id}/propose-price`,{price_usd:pu||null,price_chf:pc||null,price_eur:pe||null}))}
                  disabled={!pu&&!pc&&!pe}>&#9658; SEND PRICE PROPOSAL</Btn>
              </div>
            </div>
          )}
          {tab==='decide'&&(
            <div style={s.tabContent}>
              <span style={s.tabHint}>// optional note to user</span>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Approved! Log in to configure DNS." rows={2} style={s.textarea}/>
              <div style={s.tabBtns}>
                <Btn variant="danger"  onClick={()=>handle(()=>req('POST',`/admin/requests/${r.id}/reject`,{admin_note:note}))}>REJECT</Btn>
                <Btn variant="primary" onClick={()=>handle(()=>req('POST',`/admin/requests/${r.id}/approve`,{admin_note:note}))}>&#9658; APPROVE</Btn>
              </div>
            </div>
          )}
          {tab==='chat'&&<div style={s.tabContent}><span style={s.tabHint}>// use the conversation box above to message the user</span></div>}
        </div>
      )}
    </div>
  );
}

function StatusLine({icon,color,label,sub}){
  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:'8px'}}>
      <span style={{color,fontFamily:'var(--font-mono)',fontSize:'13px',flexShrink:0,marginTop:'1px'}}>{icon}</span>
      <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text)'}}>{label}</span>
        {sub&&<span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--muted)',fontStyle:'italic'}}>{sub}</span>}
      </div>
    </div>
  );
}
function Tag({label,color,bg}){return <span style={{fontFamily:'var(--font-display)',fontSize:'9px',padding:'2px 7px',background:bg,color,letterSpacing:'1px',border:`1px solid ${color}`,flexShrink:0}}>{label}</span>;}
function PriceField({label,value,onChange}){
  return(
    <div style={{display:'flex',alignItems:'center',background:'var(--surface)',border:'1px solid var(--border)',flex:1}}>
      <span style={{fontFamily:'var(--font-display)',fontSize:'10px',color:'var(--gold)',padding:'6px 8px',borderRight:'1px solid var(--border)',whiteSpace:'nowrap'}}>{label}</span>
      <input type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder="0.00"
        style={{flex:1,padding:'6px 8px',background:'transparent',border:'none',fontFamily:'var(--font-mono)',color:'var(--orange)',fontSize:'12px',outline:'none',width:'60px'}}/>
    </div>
  );
}
function Row({k,v}){
  return(
    <div style={s.row}>
      <span style={s.rowKey}>{k}</span>
      <span style={s.rowEq}>=</span>
      <span style={s.rowVal}>{v}</span>
    </div>
  );
}
function Stat({label,value,color}){
  return(
    <div style={s.stat}>
      <span style={{...s.statValue,color}}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}
function SectionHead({label,count,top=false}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'14px',marginTop:top?'36px':0}}>
      <span style={{fontFamily:'var(--font-display)',fontSize:'11px',color:'var(--muted)',letterSpacing:'1px',whiteSpace:'nowrap'}}>// {label} [{count}]</span>
      <div style={{flex:1,height:'1px',background:'var(--border)'}}/>
    </div>
  );
}

const s={
  loading:{fontFamily:'var(--font-mono)',color:'var(--muted)',fontSize:'13px',padding:'20px 0'},
  statsRow:{display:'flex',gap:'1px',background:'var(--border)',marginBottom:'20px'},
  stat:{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 20px',background:'var(--surface)',gap:'3px'},
  statValue:{fontFamily:'var(--font-display)',fontSize:'28px',lineHeight:1},
  statLabel:{fontFamily:'var(--font-display)',fontSize:'9px',color:'var(--muted)',letterSpacing:'1.5px'},
  ok:{padding:'8px 14px',background:'rgba(74,124,63,0.08)',border:'1px solid var(--comment)',fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--comment)',marginBottom:'16px'},
  err:{padding:'8px 14px',background:'rgba(192,57,43,0.08)',border:'1px solid var(--red)',fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--red)',marginBottom:'16px'},
  empty:{fontFamily:'var(--font-mono)',color:'var(--comment)',fontSize:'12px',padding:'20px',border:'1px dashed var(--border)',background:'var(--surface)'},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))',gap:'12px'},
  card:{background:'var(--surface)',border:'1px solid var(--border)',borderTop:'3px solid var(--gold)',display:'flex',flexDirection:'column'},
  cardHead:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--bg-2)',borderBottom:'1px solid var(--border)',gap:'8px',flexWrap:'wrap'},
  fqdn:{fontFamily:'var(--font-display)',fontSize:'15px',letterSpacing:'0.3px',wordBreak:'break-all'},
  archiveBtn:{background:'transparent',border:'1px solid var(--muted)',color:'var(--muted)',fontFamily:'var(--font-mono)',fontSize:'14px',lineHeight:1,width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0},
  cardBody:{padding:'12px 14px',display:'flex',flexDirection:'column',gap:'8px',flex:1},
  row:{display:'flex',alignItems:'flex-start',fontSize:'12px'},
  rowKey:{fontFamily:'var(--font-display)',color:'var(--gold)',minWidth:'90px',fontSize:'11px',letterSpacing:'0.3px',flexShrink:0},
  rowEq:{fontFamily:'var(--font-mono)',color:'var(--muted)',padding:'0 8px',flexShrink:0},
  rowVal:{fontFamily:'var(--font-mono)',color:'var(--text)',wordBreak:'break-all',fontSize:'12px'},
  infoPanel:{display:'flex',flexDirection:'column',gap:'6px',padding:'10px 12px',background:'var(--bg)',border:'1px solid var(--border)'},
  panelLabel:{fontFamily:'var(--font-display)',fontSize:'9px',color:'var(--muted)',letterSpacing:'1px',marginBottom:'2px'},
  ok2:{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--comment)'},
  bad:{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--red)'},
  actionArea:{borderTop:'1px solid var(--border)',background:'var(--bg)'},
  tabRow:{display:'flex',borderBottom:'1px solid var(--border)'},
  actionTab:{flex:1,padding:'7px 6px',background:'transparent',border:'none',borderBottom:'2px solid transparent',fontFamily:'var(--font-display)',color:'var(--muted)',fontSize:'9px',letterSpacing:'0.5px',cursor:'pointer',marginBottom:'-1px',transition:'all 0.1s'},
  actionTabActive:{color:'var(--gold)',borderBottomColor:'var(--gold)',background:'rgba(201,147,42,0.04)'},
  tabContent:{padding:'12px 14px',display:'flex',flexDirection:'column',gap:'8px'},
  tabHint:{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--comment)'},
  textarea:{padding:'8px 10px',background:'var(--surface)',border:'1px solid var(--border)',fontFamily:'var(--font-mono)',color:'var(--text)',fontSize:'12px',outline:'none',resize:'vertical',lineHeight:1.5},
  tabBtns:{display:'flex',gap:'8px',justifyContent:'flex-end'},
};

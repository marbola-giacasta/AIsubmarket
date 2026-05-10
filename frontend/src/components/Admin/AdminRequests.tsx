// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import Btn from '../UI/Btn';
import MessageCarousel from '../UI/MessageCarousel';

const BASE=(import.meta.env.VITE_API_URL||'')+'/api';
function authH(){return{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`};}
async function req(method,path,body=null){
  const res=await fetch(`${BASE}${path}`,{method,headers:authH(),body:body?JSON.stringify(body):undefined});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||'Request failed');
  return data;
}
async function sendAdminMsg(id,text){return(await req('POST',`/admin/requests/${id}/message`,{text})).messages;}
function buildMsgs(r){const m=Array.isArray(r.messages)?[...r.messages]:[]; if(m.length===0&&r.admin_comment)m.unshift({id:'legacy',sender:'admin',text:r.admin_comment,sent_at:r.created_at}); return m;}
function fmt(iso){return iso?new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):null;}
function fmtP(u,c,e){const p=[];if(u)p.push(`$${u}`);if(c)p.push(`${c}CHF`);if(e)p.push(`${e}EUR`);return p.length?p.join('/')+'/mo':null;}

// Renders the DNS + subscription chronological event log
function DnsTimeline({events,tagCancelled,cancelDate,hasDns,dnsType,dnsValue,dnsUpdatedAt}){
  const all=[...(Array.isArray(events)?events:[])];
  // If no logged events but we have current state, synthesise a summary
  if(all.length===0){
    if(!hasDns&&!tagCancelled) return(
      <div style={tl.row}><span style={{...tl.icon,color:'var(--red)'}}>✗</span><div><span style={tl.text}>No DNS configured yet</span></div></div>
    );
  }
  const eventLabel={
    created:'DNS created',updated:'DNS updated',deleted:'DNS deleted',
    subscription_cancelled:'Renewal cancelled','re-registered_by_admin':'Re-registered by admin',
  };
  return(
    <div style={{display:'flex',flexDirection:'column',gap:'0'}}>
      {all.map((ev,i)=>(
        <div key={i} style={tl.row}>
          <div style={tl.lineCol}>
            <span style={{...tl.icon,color:ev.event==='created'?'var(--comment)':ev.event==='updated'?'var(--blue)':ev.event==='deleted'?'var(--orange)':ev.event==='subscription_cancelled'?'var(--muted)':'var(--gold)'}}>
              {ev.event==='created'?'◉':ev.event==='updated'?'◈':ev.event==='deleted'?'◌':ev.event==='subscription_cancelled'?'∅':'↺'}
            </span>
            {i<all.length-1&&<div style={tl.connector}/>}
          </div>
          <div style={tl.content}>
            <span style={tl.text}>{eventLabel[ev.event]||ev.event}</span>
            {ev.type&&ev.value&&<span style={tl.sub}>{ev.type} → {ev.value}{ev.proxied?' (CF proxy)':''}</span>}
            {ev.at&&<span style={tl.date}>{fmt(ev.at)}</span>}
          </div>
        </div>
      ))}
      {/* Current state summary if no cancel event logged */}
      {hasDns&&!tagCancelled&&(
        <div style={tl.row}>
          <div style={tl.lineCol}><span style={{...tl.icon,color:'var(--comment)'}}>✓</span></div>
          <div style={tl.content}>
            <span style={tl.text}>DNS active</span>
            <span style={tl.sub}>{dnsType} → {dnsValue}</span>
          </div>
        </div>
      )}
      {tagCancelled&&cancelDate&&all.findIndex(e=>e.event==='subscription_cancelled')<0&&(
        <div style={tl.row}>
          <div style={tl.lineCol}><span style={{...tl.icon,color:'var(--muted)'}}>∅</span></div>
          <div style={tl.content}>
            <span style={tl.text}>Renewal cancelled</span>
            <span style={tl.date}>{fmt(cancelDate)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const tl={
  row:{display:'flex',alignItems:'flex-start',gap:'8px',minHeight:'28px'},
  lineCol:{display:'flex',flexDirection:'column',alignItems:'center',width:'18px',flexShrink:0},
  icon:{fontFamily:'var(--font-mono)',fontSize:'13px',lineHeight:'20px'},
  connector:{width:'1px',background:'var(--border)',flex:1,minHeight:'8px',margin:'2px 0'},
  content:{flex:1,minWidth:0,paddingBottom:'6px',display:'flex',flexDirection:'column',gap:'1px'},
  text:{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text)',lineHeight:1.4},
  sub:{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--muted)',fontStyle:'italic'},
  date:{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--muted)'},
};

export default function AdminRequests(){
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

  async function handle(fn){setMsg('');setError('');try{const r=await fn();setMsg(r.message||'Done');load();}catch(err){setError(err.message);}}

  const pending=requests.filter(r=>r.status==='pending');
  const resolved=requests.filter(r=>r.status!=='pending');

  if(loading)return<div style={s.loading}>// loading<span className="cursor"/></div>;

  return(
    <div className="fade-up">
      <div style={s.statsRow}>
        <Stat label="PENDING"  value={pending.length}  color="var(--gold)"/>
        <Stat label="RESOLVED" value={resolved.length} color="var(--comment)"/>
      </div>
      {msg&&<div style={s.ok}>OK -- {msg}</div>}
      {error&&<div style={s.err}>ERR -- {error}</div>}

      <SH label="PENDING" count={pending.length}/>
      {pending.length===0?<div style={s.empty}>// no pending requests</div>
        :<div style={s.grid}>{pending.map(r=><Card key={r.id} r={r} handle={handle} load={load}/>)}</div>}

      {resolved.length>0&&(
        <>
          <SH label="RESOLVED — × to archive" count={resolved.length} top/>
          <div style={s.grid}>{resolved.map(r=><Card key={r.id} r={r} resolved handle={handle} load={load}/>)}</div>
        </>
      )}
    </div>
  );
}

function Card({r,handle,load,resolved=false}){
  const [tab,setTab]=useState('chat');
  const [note,setNote]=useState('');
  const [pu,setPu]=useState('');
  const [pc,setPc]=useState('');
  const [pe,setPe]=useState('');
  const sc=r.status==='approved'?'var(--comment)':r.status==='rejected'?'var(--red)':'var(--gold)';
  const pl=r.price_status==='proposed'?'PRICE SENT':r.price_status==='accepted'?'ACCEPTED':r.price_status==='declined'?'DECLINED':null;
  const price=fmtP(r.price_usd,r.price_chf,r.price_eur);

  return(
    <div style={{...s.card,borderTopColor:sc}}>
      <div style={s.cardHead}>
        <span style={s.fqdn}>{r.fqdn}</span>
        <div style={{display:'flex',gap:'5px',alignItems:'center',flexWrap:'wrap'}}>
          {pl&&<Tag label={pl} color="var(--blue)" bg="rgba(26,92,255,0.12)"/>}
          {/* For resolved approved cards show live status; otherwise show decision */}
          {resolved && r.status==='approved' ? (
            !r.tag_exists
              ? <Tag label="RELEASED"          color="#F8F8F8" bg="#555555"/>
              : r.tag_cancelled
              ? <Tag label="RENEWAL CANCELLED" color="#F8F8F8" bg="var(--red)"/>
              : r.tag_has_dns
              ? <Tag label="ACTIVE"            color="#F8F8F8" bg="var(--comment)"/>
              : <Tag label="NO DNS"            color="#0A0A0A" bg="var(--orange)"/>
          ) : (
            <Tag label={r.status.toUpperCase()} color={r.status==='pending'?'#0A0A0A':'#F8F8F8'} bg={sc}/>
          )}
          {/* StatusTrail: visual sequence of lifecycle squares */}
          {resolved && r.status==='approved' && (
            <StatusTrail
              status={r.status}
              tagExists={r.tag_exists}
              tagCancelled={r.tag_cancelled}
              tagHasDns={r.tag_has_dns}
            />
          )}
          {resolved&&<button onClick={()=>handle(()=>req('POST',`/admin/requests/${r.id}/archive`))} style={s.xBtn}>×</button>}
        </div>
      </div>

      <div style={s.cardBody}>
        <Row k="name"      v={r.name}/>
        <Row k="email"     v={r.requester_email}/>
        <Row k="use_case"  v={r.use_case}/>
        {r.message&&<Row k="message" v={r.message}/>}
        <Row k="submitted" v={fmt(r.created_at)}/>

        {price&&(
          <div style={s.panel}>
            <span style={s.panelLbl}>// PRICE</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--blue)'}}>{price}</span>
            {r.price_status==='accepted'&&<span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--comment)'}}>✓ accepted by user</span>}
            {r.price_status==='declined'&&<span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--red)'}}>✗ declined by user</span>}
          </div>
        )}

        {/* Approved: full DNS + subscription timeline */}
        {r.status==='approved'&&(
          <div style={{...s.panel,borderColor:r.tag_cancelled?'var(--muted)':r.tag_has_dns?'var(--comment)':'var(--red)'}}>
            <span style={s.panelLbl}>// SUBSCRIPTION &amp; DNS HISTORY</span>
            {!r.tag_exists?(
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px'}}>
                <span style={{color:'var(--muted)',fontFamily:'var(--font-mono)',fontSize:'12px'}}>∅ Tag deleted before history tracking — subscription gone</span>
                <Btn variant="gold" onClick={()=>handle(()=>req('POST',`/admin/requests/${r.id}/reregister`))}
                  style={{fontSize:'10px',padding:'3px 10px'}}>↺ RE-REGISTER</Btn>
              </div>
            ):(
              <DnsTimeline
                events={r.tag_dns_events}
                tagCancelled={r.tag_cancelled}
                cancelDate={r.tag_cancel_date}
                hasDns={r.tag_has_dns}
                dnsType={r.tag_dns_type}
                dnsValue={r.tag_dns_value}
                dnsUpdatedAt={r.tag_dns_updated_at}
              />
            )}
          </div>
        )}

        {r.admin_note&&<div style={s.panel}><span style={s.panelLbl}>// decision note</span><span style={{fontFamily:'var(--font-mono)',fontSize:'12px',lineHeight:1.5}}>{r.admin_note}</span></div>}

        <MessageCarousel requestId={r.id} initialMessages={buildMsgs(r)} isAdmin={true} onSend={sendAdminMsg} pollInterval={15000}/>
      </div>

      {!resolved&&(
        <div style={s.actionArea}>
          <div style={s.tabRow}>
            {[['chat','MESSAGE'],['price','PROPOSE PRICE'],['decide','APPROVE / REJECT']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{...s.tab,...(tab===t?s.tabActive:{})}}>{l}</button>
            ))}
          </div>
          {tab==='price'&&(
            <div style={s.tabC}>
              <span style={s.hint}>// fill at least one currency</span>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                <PF label="USD $" v={pu} set={setPu}/><PF label="CHF" v={pc} set={setPc}/><PF label="EUR €" v={pe} set={setPe}/>
              </div>
              <div style={s.tabBtns}><Btn variant="gold" onClick={()=>handle(()=>req('POST',`/admin/requests/${r.id}/propose-price`,{price_usd:pu||null,price_chf:pc||null,price_eur:pe||null}))} disabled={!pu&&!pc&&!pe}>&#9658; SEND PRICE PROPOSAL</Btn></div>
            </div>
          )}
          {tab==='decide'&&(
            <div style={s.tabC}>
              <span style={s.hint}>// optional note to user</span>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Approved!" rows={2} style={s.ta}/>
              <div style={s.tabBtns}>
                <Btn variant="danger"  onClick={()=>handle(()=>req('POST',`/admin/requests/${r.id}/reject`,{admin_note:note}))}>REJECT</Btn>
                <Btn variant="primary" onClick={()=>handle(()=>req('POST',`/admin/requests/${r.id}/approve`,{admin_note:note}))}>&#9658; APPROVE</Btn>
              </div>
            </div>
          )}
          {tab==='chat'&&<div style={s.tabC}><span style={s.hint}>// use the conversation box above to message the user</span></div>}
        </div>
      )}
    </div>
  );
}


// StatusTrail: a row of coloured squares showing lifecycle at a glance.
// Square 1 = request decision (gold=pending, green=approved, red=rejected)
// Square 2 = current subscription/DNS state (only for approved requests)
function StatusTrail({ status, tagExists, tagCancelled, tagHasDns }) {
  const sq1Color = status === 'approved' ? 'var(--comment)'
                 : status === 'rejected' ? 'var(--red)'
                 : 'var(--gold)';

  const squares = [{ color: sq1Color, tip: status }];

  if (status === 'approved') {
    if (!tagExists) {
      squares.push({ color: '#555555', tip: 'Released / deleted' });
    } else if (tagCancelled) {
      squares.push({ color: 'var(--red)', tip: 'Renewal cancelled' });
    } else if (tagHasDns) {
      squares.push({ color: 'var(--comment)', tip: 'Active — DNS configured' });
    } else {
      squares.push({ color: 'var(--orange)', tip: 'Active — DNS not set' });
    }
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'3px', flexShrink:0 }}>
      {squares.map((sq, i) => (
        <div key={i} title={sq.tip} style={{
          width:'10px', height:'10px', borderRadius:'1px',
          background: sq.color, flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

function Tag({label,color,bg}){return<span style={{fontFamily:'var(--font-display)',fontSize:'9px',padding:'2px 7px',background:bg,color,letterSpacing:'1px',border:`1px solid ${color}`,flexShrink:0}}>{label}</span>;}
function PF({label,v,set}){return<div style={{display:'flex',alignItems:'center',background:'var(--surface)',border:'1px solid var(--border)',flex:1}}><span style={{fontFamily:'var(--font-display)',fontSize:'10px',color:'var(--gold)',padding:'6px 8px',borderRight:'1px solid var(--border)',whiteSpace:'nowrap'}}>{label}</span><input type="number" value={v} onChange={e=>set(e.target.value)} placeholder="0.00" style={{flex:1,padding:'6px 8px',background:'transparent',border:'none',fontFamily:'var(--font-mono)',color:'var(--orange)',fontSize:'12px',outline:'none',width:'60px'}}/></div>;}
function Row({k,v}){return<div style={s.row}><span style={s.rk}>{k}</span><span style={s.re}>=</span><span style={s.rv}>{v}</span></div>;}
function Stat({label,value,color}){return<div style={s.stat}><span style={{...s.sv,color}}>{value}</span><span style={s.sl}>{label}</span></div>;}
function SH({label,count,top=false}){return<div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'14px',marginTop:top?'36px':0}}><span style={{fontFamily:'var(--font-display)',fontSize:'11px',color:'var(--muted)',letterSpacing:'1px',whiteSpace:'nowrap'}}>// {label} [{count}]</span><div style={{flex:1,height:'1px',background:'var(--border)'}}/></div>;}

const s={
  loading:{fontFamily:'var(--font-mono)',color:'var(--muted)',fontSize:'13px',padding:'20px 0'},
  statsRow:{display:'flex',gap:'1px',background:'var(--border)',marginBottom:'20px'},
  stat:{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 20px',background:'var(--surface)',gap:'3px'},
  sv:{fontFamily:'var(--font-display)',fontSize:'28px',lineHeight:1},
  sl:{fontFamily:'var(--font-display)',fontSize:'9px',color:'var(--muted)',letterSpacing:'1.5px'},
  ok:{padding:'8px 14px',background:'rgba(74,124,63,0.08)',border:'1px solid var(--comment)',fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--comment)',marginBottom:'16px'},
  err:{padding:'8px 14px',background:'rgba(192,57,43,0.08)',border:'1px solid var(--red)',fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--red)',marginBottom:'16px'},
  empty:{fontFamily:'var(--font-mono)',color:'var(--comment)',fontSize:'12px',padding:'20px',border:'1px dashed var(--border)',background:'var(--surface)'},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))',gap:'12px'},
  card:{background:'var(--surface)',border:'1px solid var(--border)',borderTop:'3px solid var(--gold)',display:'flex',flexDirection:'column'},
  cardHead:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--bg-2)',borderBottom:'1px solid var(--border)',gap:'8px',flexWrap:'wrap'},
  fqdn:{fontFamily:'var(--font-display)',fontSize:'15px',letterSpacing:'0.3px',wordBreak:'break-all'},
  xBtn:{background:'transparent',border:'1px solid var(--muted)',color:'var(--muted)',fontFamily:'var(--font-mono)',fontSize:'14px',lineHeight:1,width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0},
  cardBody:{padding:'12px 14px',display:'flex',flexDirection:'column',gap:'8px',flex:1},
  row:{display:'flex',alignItems:'flex-start',fontSize:'12px'},
  rk:{fontFamily:'var(--font-display)',color:'var(--gold)',minWidth:'90px',fontSize:'11px',letterSpacing:'0.3px',flexShrink:0},
  re:{fontFamily:'var(--font-mono)',color:'var(--muted)',padding:'0 8px',flexShrink:0},
  rv:{fontFamily:'var(--font-mono)',color:'var(--text)',wordBreak:'break-all',fontSize:'12px'},
  panel:{display:'flex',flexDirection:'column',gap:'6px',padding:'10px 12px',background:'var(--bg)',border:'1px solid var(--border)'},
  panelLbl:{fontFamily:'var(--font-display)',fontSize:'9px',color:'var(--muted)',letterSpacing:'1px',marginBottom:'2px'},
  actionArea:{borderTop:'1px solid var(--border)',background:'var(--bg)'},
  tabRow:{display:'flex',borderBottom:'1px solid var(--border)'},
  tab:{flex:1,padding:'7px 6px',background:'transparent',border:'none',borderBottom:'2px solid transparent',fontFamily:'var(--font-display)',color:'var(--muted)',fontSize:'9px',letterSpacing:'0.5px',cursor:'pointer',marginBottom:'-1px',transition:'all 0.1s'},
  tabActive:{color:'var(--gold)',borderBottomColor:'var(--gold)',background:'rgba(201,147,42,0.04)'},
  tabC:{padding:'12px 14px',display:'flex',flexDirection:'column',gap:'8px'},
  hint:{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--comment)'},
  ta:{padding:'8px 10px',background:'var(--surface)',border:'1px solid var(--border)',fontFamily:'var(--font-mono)',color:'var(--text)',fontSize:'12px',outline:'none',resize:'vertical',lineHeight:1.5},
  tabBtns:{display:'flex',gap:'8px',justifyContent:'flex-end'},
};

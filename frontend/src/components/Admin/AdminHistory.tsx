// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import Btn from '../UI/Btn';

const BASE=(import.meta.env.VITE_API_URL||'')+'/api';
function authH(){return{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`};}
async function req(method,path,body=null){
  const res=await fetch(`${BASE}${path}`,{method,headers:authH(),body:body?JSON.stringify(body):undefined});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||'Failed');
  return data;
}
function fmt(iso){return iso?new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):null;}
function fmtP(u,c,e){const p=[];if(u)p.push(`$${u}`);if(c)p.push(`${c}CHF`);if(e)p.push(`${e}EUR`);return p.length?p.join('/')+'/mo':null;}

const STATUS_COLOR={pending:'var(--gold)',approved:'var(--comment)',rejected:'var(--red)'};

// Build full timeline from request + tag_data
function buildTimeline(r) {
  const ev=[];
  ev.push({icon:'→',color:'var(--muted)',text:`Submitted: ${r.fqdn}`,sub:r.use_case,at:r.created_at});

  if(r.price_usd||r.price_chf||r.price_eur){
    const price=fmtP(r.price_usd,r.price_chf,r.price_eur);
    ev.push({icon:'$',color:'var(--blue)',text:`Price proposed: ${price}`,
      sub:r.price_status==='accepted'?'✓ User accepted':r.price_status==='declined'?'✗ User declined':'Awaiting response',at:null});
  }

  if(r.status==='approved'){
    ev.push({icon:'✓',color:'var(--comment)',text:'Request approved — subdomain registered',sub:r.admin_note||null,at:null});
  }
  if(r.status==='rejected'){
    ev.push({icon:'✗',color:'var(--red)',text:'Request rejected',sub:r.admin_note||null,at:r.created_at});
  }

  const msgCount=Array.isArray(r.messages)?r.messages.length:0;
  if(msgCount>0) ev.push({icon:'✉',color:'var(--blue)',text:`${msgCount} message${msgCount!==1?'s':''} in conversation`,sub:null,at:null});

  // DNS events from the tag
  if(r.tag_data){
    const dnsEvs=Array.isArray(r.tag_data.dns_events)?r.tag_data.dns_events:[];
    const eventLabel={created:'DNS created',updated:'DNS updated',deleted:'DNS deleted',subscription_cancelled:'Renewal cancelled','re-registered_by_admin':'Re-registered by admin'};
    dnsEvs.forEach(de=>{
      ev.push({
        icon:de.event==='created'?'◉':de.event==='updated'?'◈':de.event==='deleted'?'◌':de.event==='subscription_cancelled'?'∅':'↺',
        color:de.event==='created'?'var(--comment)':de.event==='updated'?'var(--blue)':de.event==='deleted'?'var(--orange)':de.event==='subscription_cancelled'?'var(--muted)':'var(--gold)',
        text:eventLabel[de.event]||de.event,
        sub:de.type&&de.value?`${de.type} → ${de.value}${de.proxied?' (CF proxy)':''}`:null,
        at:de.at,
      });
    });
    // If no dns_events but tag has current state
    if(dnsEvs.length===0){
      if(r.tag_data.dns_type&&r.tag_data.dns_value){
        ev.push({icon:'◉',color:'var(--comment)',text:`DNS active: ${r.tag_data.dns_type} → ${r.tag_data.dns_value}`,sub:null,at:null});
      }
      if(r.tag_data.subscription_cancelled){
        ev.push({icon:'∅',color:'var(--muted)',text:'Renewal cancelled',sub:null,at:r.tag_data.subscription_cancel_date});
      }
    }
  } else if(r.status==='approved'){
    ev.push({icon:'∅',color:'var(--muted)',text:'Tag no longer exists — was deleted before history tracking',sub:null,at:null});
  }

  return ev;
}

export default function AdminHistory(){
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [clearStep,setClearStep]=useState(0);

  const load=useCallback(async()=>{
    setLoading(true);
    try{const{requests}=await req('GET','/admin/requests/history');setRequests(requests);}
    catch(err){setError(err.message);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  async function handleDelete(id){try{await req('DELETE',`/admin/requests/${id}`);load();}catch(err){setError(err.message);}}
  async function handleClearAll(){
    if(clearStep<2){setClearStep(c=>c+1);return;}
    try{await req('DELETE','/admin/requests/history/all');setClearStep(0);load();}
    catch(err){setError(err.message);setClearStep(0);}
  }

  if(loading)return<div style={s.loading}>// loading history<span className="cursor"/></div>;

  return(
    <div className="fade-up">
      {error&&<div style={s.err}>ERR -- {error}</div>}

      {requests.length>0&&(
        <div style={{marginBottom:'16px',display:'flex',justifyContent:'flex-end'}}>
          {clearStep===0&&<Btn variant="danger" onClick={handleClearAll} style={{fontSize:'11px'}}>CLEAR ALL HISTORY</Btn>}
          {clearStep===1&&<div style={{display:'flex',gap:'8px',alignItems:'center'}}><span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--red)'}}>// are you sure?</span><Btn variant="ghost" onClick={()=>setClearStep(0)} style={{fontSize:'11px'}}>CANCEL</Btn><Btn variant="danger" onClick={handleClearAll} style={{fontSize:'11px'}}>YES, DELETE ALL</Btn></div>}
          {clearStep===2&&<div style={{display:'flex',gap:'8px',alignItems:'center'}}><span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--red)'}}>// permanently delete {requests.length} records?</span><Btn variant="ghost" onClick={()=>setClearStep(0)} style={{fontSize:'11px'}}>CANCEL</Btn><Btn variant="danger" onClick={handleClearAll} style={{fontSize:'11px'}}>CONFIRM</Btn></div>}
        </div>
      )}

      {requests.length===0?<div style={s.empty}>// no history — archive resolved requests to see them here</div>:(
        <div style={s.list}>
          {requests.map(r=>{
            const sc=STATUS_COLOR[r.status]||'var(--muted)';
            const price=fmtP(r.price_usd,r.price_chf,r.price_eur);
            const timeline=buildTimeline(r);
            return(
              <div key={r.id} style={s.record}>
                <div style={s.rHead}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'10px',flex:1,minWidth:0}}>
                    <div style={{...s.dot,background:sc,marginTop:'4px'}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={s.fqdn}>{r.fqdn}</span>
                      <div style={s.headMeta}>
                        <span style={{fontFamily:'var(--font-display)',fontSize:'9px',padding:'2px 7px',background:sc,color:r.status==='pending'?'#0A0A0A':'#F8F8F8',letterSpacing:'1px'}}>{r.status.toUpperCase()}</span>
                        {price&&<span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--blue)'}}>{price}{r.price_status==='accepted'?' ✓':r.price_status==='declined'?' ✗':''}</span>}
                        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--muted)'}}>{r.requester_email}</span>
                        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--muted)'}}>{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>handleDelete(r.id)} style={s.delBtn}>×</button>
                </div>
                <div style={s.timeline}>
                  {timeline.map((ev,i)=>(
                    <div key={i} style={s.evRow}>
                      <div style={s.lineCol}>
                        <span style={{color:ev.color,fontFamily:'var(--font-mono)',fontSize:'13px',lineHeight:'20px'}}>{ev.icon}</span>
                        {i<timeline.length-1&&<div style={s.connector}/>}
                      </div>
                      <div style={s.evContent}>
                        <span style={s.evText}>{ev.text}</span>
                        {ev.sub&&<span style={s.evSub}>{ev.sub}</span>}
                        {ev.at&&<span style={s.evDate}>{fmt(ev.at)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s={
  loading:{fontFamily:'var(--font-mono)',color:'var(--muted)',fontSize:'13px',padding:'20px 0'},
  err:{padding:'8px 14px',background:'rgba(192,57,43,0.08)',border:'1px solid var(--red)',fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--red)',marginBottom:'16px'},
  empty:{padding:'24px',border:'1px dashed var(--border)',background:'var(--surface)',fontFamily:'var(--font-mono)',color:'var(--comment)',fontSize:'12px'},
  list:{display:'flex',flexDirection:'column',gap:'12px'},
  record:{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'},
  rHead:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'12px 14px',background:'var(--bg-2)',borderBottom:'1px solid var(--border)',gap:'8px'},
  dot:{width:'10px',height:'10px',borderRadius:'1px',flexShrink:0},
  fqdn:{fontFamily:'var(--font-display)',fontSize:'15px',color:'var(--text)',letterSpacing:'0.3px',wordBreak:'break-all',display:'block',marginBottom:'4px'},
  headMeta:{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'8px'},
  delBtn:{background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',fontFamily:'var(--font-mono)',fontSize:'14px',lineHeight:1,width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0},
  timeline:{padding:'12px 14px',display:'flex',flexDirection:'column'},
  evRow:{display:'flex',gap:'10px',alignItems:'flex-start'},
  lineCol:{display:'flex',flexDirection:'column',alignItems:'center',width:'20px',flexShrink:0},
  connector:{width:'1px',background:'var(--border)',flex:1,minHeight:'12px',margin:'2px 0'},
  evContent:{flex:1,minWidth:0,paddingBottom:'10px',display:'flex',flexDirection:'column',gap:'2px'},
  evText:{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text)',lineHeight:1.5},
  evSub:{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--comment)',fontStyle:'italic'},
  evDate:{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--muted)'},
};

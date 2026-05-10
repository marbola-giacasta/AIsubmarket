// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import Btn from '../UI/Btn';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
function authH() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }; }
async function req(method, path, body = null) {
  const res  = await fetch(`${BASE}${path}`, { method, headers: authH(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

function fmt(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtP(u, c, e) {
  const p = [];
  if (u) p.push(`$${u}`);
  if (c) p.push(`${c}CHF`);
  if (e) p.push(`${e}EUR`);
  return p.length ? p.join('/') + '/mo' : null;
}

const STATUS_COLOR = { pending: 'var(--gold)', approved: 'var(--comment)', rejected: 'var(--red)' };
const DNS_ICON     = { created: '◉', updated: '◈', deleted: '◌', subscription_cancelled: '∅', 're-registered_by_admin': '↺' };
const DNS_COLOR    = { created: 'var(--comment)', updated: 'var(--blue)', deleted: 'var(--orange)', subscription_cancelled: 'var(--muted)', 're-registered_by_admin': 'var(--gold)' };
const DNS_LABEL    = { created: 'DNS configured', updated: 'DNS updated', deleted: 'DNS record deleted', subscription_cancelled: 'Renewal cancelled', 're-registered_by_admin': 'Re-registered by admin' };

function buildTimeline(r) {
  const ev = [];

  ev.push({ icon: '→', color: 'var(--muted)', text: 'Request submitted', sub: r.use_case, at: r.created_at });

  const price = fmtP(r.price_usd, r.price_chf, r.price_eur);
  if (price) {
    ev.push({
      icon: '$', color: 'var(--blue)', text: `Price proposed: ${price}`,
      sub:  r.price_status === 'accepted' ? '✓ User accepted'
          : r.price_status === 'declined' ? '✗ User declined'
          : 'Awaiting response',
      at: null,
    });
  }

  if (r.status === 'approved')  ev.push({ icon: '✓', color: 'var(--comment)', text: 'Request approved — subdomain registered', sub: r.admin_note || null, at: null });
  if (r.status === 'rejected')  ev.push({ icon: '✗', color: 'var(--red)',     text: 'Request rejected', sub: r.admin_note || null, at: null });

  const msgCount = Array.isArray(r.messages) ? r.messages.length : 0;
  if (msgCount > 0) ev.push({ icon: '✉', color: 'var(--blue)', text: `${msgCount} message${msgCount !== 1 ? 's' : ''} exchanged`, sub: null, at: null });

  // DNS + subscription state — always complete for approved requests
  if (r.status === 'approved') {
    if (r.tag_data) {
      const dnsEvs = Array.isArray(r.tag_data.dns_events) ? r.tag_data.dns_events : [];

      if (dnsEvs.length > 0) {
        dnsEvs.forEach(de => {
          ev.push({
            icon:  DNS_ICON[de.event]  || '·',
            color: DNS_COLOR[de.event] || 'var(--muted)',
            text:  DNS_LABEL[de.event] || de.event,
            sub:   de.type && de.value ? `${de.type} → ${de.value}${de.proxied ? ' (Cloudflare proxy)' : ''}` : null,
            at:    de.at,
          });
        });
      } else {
        // No audit trail yet — synthesise from current tag state
        if (r.tag_data.dns_type && r.tag_data.dns_value) {
          ev.push({ icon: '◉', color: 'var(--comment)', text: 'DNS active', sub: `${r.tag_data.dns_type} → ${r.tag_data.dns_value}`, at: null });
        } else {
          ev.push({ icon: '✗', color: 'var(--red)', text: 'No DNS configured yet', sub: 'Subdomain is registered but DNS has not been set up', at: null });
        }
        if (r.tag_data.subscription_cancelled) {
          ev.push({ icon: '∅', color: 'var(--muted)', text: 'Renewal cancelled', sub: null, at: r.tag_data.subscription_cancel_date });
        } else {
          ev.push({ icon: '✓', color: 'var(--comment)', text: 'Renewal active', sub: 'Subscription is running', at: null });
        }
      }
    } else {
      // tag_data is null — tag was deleted by old code before mark-not-delete fix
      ev.push({ icon: '∅', color: 'var(--muted)', text: 'Subscription ended — tag was deleted', sub: 'Occurred before cancellation tracking was introduced', at: null });
    }
  }

  return ev;
}


// StatusTrail: coloured squares showing request lifecycle left-to-right
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
        <div key={i} title={sq.tip} style={{ width:'10px', height:'10px', borderRadius:'1px', background: sq.color, flexShrink:0 }} />
      ))}
    </div>
  );
}

export default function AdminHistory() {
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState('');
  const [error,     setError]     = useState('');
  const [clearStep, setClearStep] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try   { const { requests } = await req('GET', '/admin/requests/history'); setRequests(requests); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    try { await req('DELETE', `/admin/requests/${id}`); load(); }
    catch (e) { setError(e.message); }
  }

  // RE-REGISTER: re-creates the tag for an approved request whose tag was deleted
  async function handleReregister(id) {
    setMsg(''); setError('');
    try {
      const { message } = await req('POST', `/admin/requests/${id}/reregister`);
      setMsg(message);
      load(); // refresh to show the tag now exists
    } catch (e) { setError(e.message); }
  }

  async function handleClearAll() {
    if (clearStep < 2) { setClearStep(c => c + 1); return; }
    try { await req('DELETE', '/admin/requests/history/all'); setClearStep(0); load(); }
    catch (e) { setError(e.message); setClearStep(0); }
  }

  if (loading) return <div style={s.loading}>// loading history<span className="cursor" /></div>;

  return (
    <div className="fade-up">
      {msg   && <div style={s.ok}>OK -- {msg}</div>}
      {error && <div style={s.err}>ERR -- {error}</div>}

      {requests.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {clearStep === 0 && <Btn variant="danger" onClick={handleClearAll} style={{ fontSize: '11px' }}>CLEAR ALL HISTORY</Btn>}
          {clearStep === 1 && <>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)' }}>// are you sure?</span>
            <Btn variant="ghost"  onClick={() => setClearStep(0)} style={{ fontSize: '11px' }}>CANCEL</Btn>
            <Btn variant="danger" onClick={handleClearAll}        style={{ fontSize: '11px' }}>YES, DELETE ALL</Btn>
          </>}
          {clearStep === 2 && <>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)' }}>// permanently delete {requests.length} records?</span>
            <Btn variant="ghost"  onClick={() => setClearStep(0)} style={{ fontSize: '11px' }}>CANCEL</Btn>
            <Btn variant="danger" onClick={handleClearAll}        style={{ fontSize: '11px' }}>CONFIRM</Btn>
          </>}
        </div>
      )}

      {requests.length === 0
        ? <div style={s.empty}>// no history — archive resolved requests from the requests tab to see them here</div>
        : <div style={s.list}>
            {requests.map(r => {
              const sc       = STATUS_COLOR[r.status] || 'var(--muted)';
              const price    = fmtP(r.price_usd, r.price_chf, r.price_eur);
              const timeline = buildTimeline(r);
              const tagGone  = r.status === 'approved' && !r.tag_data;

              return (
                <div key={r.id} style={s.record}>
                  <div style={s.rHead}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{ flexShrink:0, marginTop:'4px' }}>
                        <StatusTrail
                          status={r.status}
                          tagExists={r.tag_data !== null && r.tag_data !== undefined}
                          tagCancelled={r.tag_data?.subscription_cancelled}
                          tagHasDns={!!(r.tag_data?.dns_type && r.tag_data?.dns_value)}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={s.fqdn}>{r.fqdn}</span>
                        <div style={s.meta}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', padding: '2px 7px', background: sc, color: r.status === 'pending' ? '#0A0A0A' : '#F8F8F8', letterSpacing: '1px' }}>
                            {r.status.toUpperCase()}
                          </span>
                          {price && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue)' }}>
                              {price}{r.price_status === 'accepted' ? ' ✓' : r.price_status === 'declined' ? ' ✗' : ''}
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>{r.requester_email}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {/* RE-REGISTER: only for approved requests whose tag was deleted */}
                      {tagGone && (
                        <Btn variant="gold" onClick={() => handleReregister(r.id)} style={{ fontSize: '10px', padding: '3px 10px' }}>
                          ↺ RE-REGISTER
                        </Btn>
                      )}
                      <button onClick={() => handleDelete(r.id)} style={s.delBtn}>×</button>
                    </div>
                  </div>

                  {/* Chronological timeline */}
                  <div style={s.timeline}>
                    {timeline.map((ev, i) => (
                      <div key={i} style={s.evRow}>
                        <div style={s.lineCol}>
                          <span style={{ color: ev.color, fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '20px' }}>{ev.icon}</span>
                          {i < timeline.length - 1 && <div style={s.connector} />}
                        </div>
                        <div style={s.evContent}>
                          <span style={s.evText}>{ev.text}</span>
                          {ev.sub && <span style={s.evSub}>{ev.sub}</span>}
                          {ev.at  && <span style={s.evDate}>{fmt(ev.at)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

const s = {
  loading:   { fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: '13px', padding: '20px 0' },
  ok:        { padding: '8px 14px', background: 'rgba(74,124,63,0.08)', border: '1px solid var(--comment)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--comment)', marginBottom: '16px' },
  err:       { padding: '8px 14px', background: 'rgba(192,57,43,0.08)', border: '1px solid var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)', marginBottom: '16px' },
  empty:     { padding: '24px', border: '1px dashed var(--border)', background: 'var(--surface)', fontFamily: 'var(--font-mono)', color: 'var(--comment)', fontSize: '12px' },
  list:      { display: 'flex', flexDirection: 'column', gap: '12px' },
  record:    { background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' },
  rHead:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', gap: '8px' },
  fqdn:      { fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text)', letterSpacing: '0.3px', wordBreak: 'break-all', display: 'block', marginBottom: '4px' },
  meta:      { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  delBtn:    { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '14px', lineHeight: 1, width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  timeline:  { padding: '12px 14px', display: 'flex', flexDirection: 'column' },
  evRow:     { display: 'flex', gap: '10px', alignItems: 'flex-start' },
  lineCol:   { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 },
  connector: { width: '1px', background: 'var(--border)', flex: 1, minHeight: '12px', margin: '2px 0' },
  evContent: { flex: 1, minWidth: 0, paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '2px' },
  evText:    { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 },
  evSub:     { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--comment)', fontStyle: 'italic' },
  evDate:    { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' },
};

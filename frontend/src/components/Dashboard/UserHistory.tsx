// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

const STATUS_COLOR = { pending: 'var(--gold)', approved: 'var(--comment)', rejected: 'var(--red)' };

function fmt(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtP(u, c, e) {
  const p = [];
  if (u) p.push(`$${u}`);
  if (c) p.push(`${c} CHF`);
  if (e) p.push(`${e} EUR`);
  return p.length ? p.join(' / ') + '/mo' : null;
}

const DNS_ICON  = { created: '◉', updated: '◈', deleted: '◌', subscription_cancelled: '∅', 're-registered_by_admin': '↺' };
const DNS_COLOR = { created: 'var(--comment)', updated: 'var(--blue)', deleted: 'var(--orange)', subscription_cancelled: 'var(--muted)', 're-registered_by_admin': 'var(--gold)' };
const DNS_LABEL = {
  created:                 'You configured DNS',
  updated:                 'You updated DNS settings',
  deleted:                 'You removed the DNS record',
  subscription_cancelled:  'You cancelled the renewal',
  're-registered_by_admin':'Admin re-registered your subdomain',
};

function buildTimeline(r) {
  const ev = [];

  // 1. Submission
  ev.push({ icon: '→', color: 'var(--muted)', text: `Request submitted for ${r.fqdn}`, sub: r.use_case, at: r.created_at });

  // 2. Price
  const price = fmtP(r.price_usd, r.price_chf, r.price_eur);
  if (price) {
    ev.push({
      icon: '$', color: 'var(--blue)',
      text: `Admin proposed ${price}`,
      sub:  r.price_status === 'accepted' ? '✓ You accepted the price'
          : r.price_status === 'declined' ? '✗ You declined the price'
          : 'Awaiting your response',
      at: null,
    });
  }

  // 3. Decision
  if (r.status === 'approved') {
    ev.push({ icon: '✓', color: 'var(--comment)', text: 'Request approved — subdomain registered', sub: r.admin_note || null, at: null });
  } else if (r.status === 'rejected') {
    ev.push({ icon: '✗', color: 'var(--red)', text: 'Request rejected', sub: r.admin_note || null, at: null });
  }

  // 4. Messages
  const msgCount = Array.isArray(r.messages) ? r.messages.length : 0;
  if (msgCount > 0) {
    ev.push({ icon: '✉', color: 'var(--blue)', text: `${msgCount} message${msgCount !== 1 ? 's' : ''} exchanged with admin`, sub: null, at: null });
  }

  // 5. DNS + subscription — always show something for approved requests
  if (r.status === 'approved') {
    if (r.tag_data) {
      const dnsEvs = Array.isArray(r.tag_data.dns_events) ? r.tag_data.dns_events : [];

      if (dnsEvs.length > 0) {
        // Full audit trail
        dnsEvs.forEach(de => {
          ev.push({
            icon:  DNS_ICON[de.event]  || '·',
            color: DNS_COLOR[de.event] || 'var(--muted)',
            text:  DNS_LABEL[de.event] || de.event,
            sub:   de.type && de.value ? `${de.type} → ${de.value}${de.proxied ? ' (Cloudflare proxy on)' : ''}` : null,
            at:    de.at,
          });
        });
      } else {
        // No audit trail yet — show current state
        if (r.tag_data.dns_type && r.tag_data.dns_value) {
          ev.push({ icon: '◉', color: 'var(--comment)', text: 'DNS is active', sub: `${r.tag_data.dns_type} → ${r.tag_data.dns_value}`, at: null });
        } else {
          ev.push({ icon: '✗', color: 'var(--red)', text: 'DNS not configured', sub: 'Your subdomain is registered but has no DNS record yet', at: null });
        }

        // Always show subscription state
        if (r.tag_data.subscription_cancelled) {
          ev.push({ icon: '∅', color: 'var(--muted)', text: 'You cancelled the renewal', sub: 'Subdomain will not renew', at: r.tag_data.subscription_cancel_date });
        } else {
          ev.push({ icon: '✓', color: 'var(--comment)', text: 'Renewal is active', sub: 'Auto-renewal is on', at: null });
        }
      }
    } else {
      // Tag gone — deleted by old cancel code
      ev.push({ icon: '∅', color: 'var(--muted)', text: 'Subscription ended', sub: 'This subdomain was released before cancellation tracking was introduced', at: null });
    }
  }

  return ev;
}

export default function UserHistory() {
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [clearStep, setClearStep] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try   { const { requests } = await api.getMyHistory(); setRequests(requests); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    try { await api.deleteMyRequest(id); load(); }
    catch (e) { setError(e.message); }
  }
  async function handleClearAll() {
    if (clearStep < 2) { setClearStep(c => c + 1); return; }
    try { await api.clearMyHistory(); setClearStep(0); load(); }
    catch (e) { setError(e.message); setClearStep(0); }
  }

  if (loading) return (
    <div style={{ padding: '20px', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: '12px' }}>
      // loading history<span className="cursor" />
    </div>
  );

  return (
    <div className="fade-up">
      {error && <div style={s.err}>ERR -- {error}</div>}

      {requests.length === 0 ? (
        <div style={s.empty}>
          <span style={{ color: 'var(--comment)' }}>// no history yet</span><br />
          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>// dismissed request cards will appear here with their full timeline</span>
        </div>
      ) : (
        <>
          {/* Clear controls */}
          <div style={{ marginBottom: '16px' }}>
            {clearStep === 0 && <button onClick={handleClearAll} style={s.lb}>[ clear all history ]</button>}
            {clearStep === 1 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              <span style={{ color: 'var(--red)' }}>// are you sure? </span>
              <button onClick={() => setClearStep(0)} style={s.lb}>[ cancel ]</button>{' '}
              <button onClick={handleClearAll} style={{ ...s.lb, color: 'var(--red)' }}>[ yes, delete all ]</button>
            </span>}
            {clearStep === 2 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              <span style={{ color: 'var(--red)' }}>// permanently delete {requests.length} records? </span>
              <button onClick={() => setClearStep(0)} style={s.lb}>[ cancel ]</button>{' '}
              <button onClick={handleClearAll} style={{ ...s.lb, color: 'var(--red)' }}>[ confirm ]</button>
            </span>}
          </div>

          <div style={s.list}>
            {requests.map(r => {
              const sc       = STATUS_COLOR[r.status] || 'var(--muted)';
              const price    = fmtP(r.price_usd, r.price_chf, r.price_eur);
              const timeline = buildTimeline(r);
              return (
                <div key={r.id} style={s.record}>
                  {/* Header */}
                  <div style={s.rHead}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '1px', background: sc, flexShrink: 0, marginTop: '5px' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={s.fqdn}>{r.fqdn}</span>
                        <div style={s.meta}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', padding: '2px 7px', background: sc, color: r.status === 'pending' ? '#0A0A0A' : '#F8F8F8', letterSpacing: '1px' }}>
                            {r.status.toUpperCase()}
                          </span>
                          {price && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue)' }}>
                            {price}{r.price_status === 'accepted' ? ' ✓' : r.price_status === 'declined' ? ' ✗' : ''}
                          </span>}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
                            {new Date(r.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(r.id)} style={s.delBtn}>×</button>
                  </div>

                  {/* Timeline */}
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
        </>
      )}
    </div>
  );
}

const s = {
  err:       { padding: '8px 14px', background: 'rgba(192,57,43,0.08)', border: '1px solid var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)', marginBottom: '16px' },
  empty:     { padding: '28px 20px', border: '1px dashed var(--border)', background: 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 2.2 },
  lb:        { background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', padding: 0 },
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

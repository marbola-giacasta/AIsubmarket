// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// MessageCarousel.tsx
// Shows a thread of messages as horizontal swipeable slides.
// Each slide = one message. User navigates with arrows or swipe.
// Auto-polls for new messages every 15 seconds.
//
// Slide layout:
//   [sender badge] [timestamp]
//   [message text — scrollable vertically if long]
//   [slide counter: 2 / 5]  [← →]
//
// Touch swipe: track touchstart X, on touchend calculate delta,
// if |delta| > 40px treat as swipe left or right.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function MessageCarousel({ requestId, initialMessages = [], currentUserId, isAdmin = false, onSend, pollInterval = 15000 }) {
  const [messages,  setMessages]  = useState(normalise(initialMessages));
  const [current,   setCurrent]   = useState(0);         // index of visible slide
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState('');
  const touchStartX = useRef(null);

  // ── Auto-poll ─────────────────────────────────────────────
  // Every pollInterval ms fetch the latest messages so both
  // sides see new messages without manually refreshing.
  useEffect(() => {
    if (!pollInterval || !onSend) return;
    const id = setInterval(async () => {
      try {
        const fresh = await fetchMessages(requestId, isAdmin);
        setMessages(normalise(fresh));
      } catch (_) { /* silent — polling failure shouldn't disrupt UI */ }
    }, pollInterval);
    return () => clearInterval(id);
  }, [requestId, pollInterval, isAdmin]);

  // Jump to newest message when messages list grows
  useEffect(() => {
    setCurrent(Math.max(0, messages.length - 1));
  }, [messages.length]);

  // ── Navigation ────────────────────────────────────────────
  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min(messages.length - 1, c + 1));

  // ── Touch swipe ───────────────────────────────────────────
  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -40) next(); // swipe left → next
    if (delta >  40) prev(); // swipe right → prev
  }

  // ── Send ──────────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !onSend) return;
    setSending(true); setSendError('');
    try {
      const updated = await onSend(requestId, text.trim(), isAdmin);
      setMessages(normalise(updated));
      setText('');
    } catch (err) { setSendError(err.message); }
    finally { setSending(false); }
  }

  const msg = messages[current];
  const hasMessages = messages.length > 0;

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerDot} />
        <span style={s.headerTitle}>CONVERSATION</span>
        {hasMessages && (
          <span style={s.counter}>{current + 1} / {messages.length}</span>
        )}
      </div>

      {/* Slide area */}
      <div
        style={s.slideArea}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!hasMessages ? (
          <div style={s.empty}>
            <span style={{ color:'var(--comment)', fontFamily:'var(--font-mono)', fontSize:'11px' }}>
              // no messages yet — start the conversation below
            </span>
          </div>
        ) : (
          <div style={s.slide} key={current}>
            {/* Sender + time */}
            <div style={s.slideMeta}>
              <span style={{
                ...s.senderBadge,
                background: msg.sender === 'admin' ? 'var(--gold)' : 'var(--blue)',
                color: '#0A0A0A',
              }}>
                {msg.sender === 'admin' ? 'ADMIN' : 'YOU'}
              </span>
              <span style={s.slideTime}>{formatTime(msg.sent_at)}</span>
            </div>
            {/* Message text — scrolls vertically if long */}
            <div style={s.slideText}>{msg.text}</div>

            {/* Navigation arrows */}
            {messages.length > 1 && (
              <div style={s.arrows}>
                <button onClick={prev} disabled={current === 0} style={s.arrowBtn}>&#8592;</button>
                <div style={s.dots}>
                  {messages.map((_, i) => (
                    <span
                      key={i}
                      onClick={() => setCurrent(i)}
                      style={{ ...s.dot, background: i === current ? 'var(--gold)' : 'var(--border)' }}
                    />
                  ))}
                </div>
                <button onClick={next} disabled={current === messages.length - 1} style={s.arrowBtn}>&#8594;</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send form — shown to both sides */}
      {onSend && (
        <form onSubmit={handleSend} style={s.form}>
          <div style={s.inputRow}>
            <span style={s.inputPrefix}>
              {isAdmin ? '// admin:' : '// you:'}
            </span>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="type a message..."
              style={s.input}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !text.trim()} style={s.sendBtn}>
              {sending ? '...' : 'SEND'}
            </button>
          </div>
          {sendError && <p style={s.sendError}>ERR: {sendError}</p>}
        </form>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

// Ensure messages is always an array of proper objects.
// Old admin_comment strings are handled upstream before passing in.
function normalise(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

// Called by the poll interval — fetches fresh messages for this request
async function fetchMessages(requestId, isAdmin) {
  const base  = (typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL : '') || '';
  const path  = isAdmin
    ? `/api/admin/requests/${requestId}/messages`
    : `/api/subdomains/requests/${requestId}/messages`;
  const token = localStorage.getItem('token');
  const res   = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fetch failed');
  return data.messages;
}

const s = {
  wrap:       { border:'1px solid rgba(26,92,255,0.3)', background:'rgba(26,92,255,0.03)', display:'flex', flexDirection:'column' },
  header:     { display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'rgba(26,92,255,0.06)', borderBottom:'1px solid rgba(26,92,255,0.2)' },
  headerDot:  { width:'7px', height:'7px', background:'var(--blue)', flexShrink:0, borderRadius:'1px' },
  headerTitle:{ fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--blue)', letterSpacing:'1.5px', flex:1 },
  counter:    { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' },

  slideArea:  { minHeight:'90px', padding:'12px', position:'relative', userSelect:'none' },
  empty:      { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60px' },
  slide:      { display:'flex', flexDirection:'column', gap:'8px', animation:'fadeIn 0.15s ease' },
  slideMeta:  { display:'flex', alignItems:'center', gap:'8px' },
  senderBadge:{ fontFamily:'var(--font-display)', fontSize:'9px', padding:'2px 7px', letterSpacing:'1px', flexShrink:0 },
  slideTime:  { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--muted)' },
  slideText:  { fontFamily:'var(--font-mono)', fontSize:'12px', color:'var(--text)', lineHeight:1.6, maxHeight:'80px', overflowY:'auto', wordBreak:'break-word' },

  arrows:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'6px' },
  arrowBtn:   { background:'none', border:'none', fontFamily:'var(--font-mono)', fontSize:'16px', color:'var(--blue)', cursor:'pointer', padding:'0 4px', opacity:1, transition:'opacity 0.1s', ':disabled':{ opacity:0.3 } },
  dots:       { display:'flex', gap:'5px', alignItems:'center' },
  dot:        { width:'6px', height:'6px', borderRadius:'50%', cursor:'pointer', transition:'background 0.15s' },

  form:       { borderTop:'1px solid rgba(26,92,255,0.2)', padding:'8px 12px', display:'flex', flexDirection:'column', gap:'4px' },
  inputRow:   { display:'flex', alignItems:'center', gap:'0', background:'var(--bg)', border:'1px solid var(--border)' },
  inputPrefix:{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--comment)', padding:'7px 10px', borderRight:'1px solid var(--border)', whiteSpace:'nowrap', flexShrink:0 },
  input:      { flex:1, padding:'7px 8px', background:'transparent', border:'none', fontFamily:'var(--font-mono)', color:'var(--text)', fontSize:'12px', outline:'none', minWidth:0 },
  sendBtn:    { padding:'7px 12px', background:'var(--blue)', border:'none', color:'#F8F8F8', fontFamily:'var(--font-display)', fontSize:'12px', cursor:'pointer', flexShrink:0, transition:'opacity 0.1s' },
  sendError:  { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--red)' },
};

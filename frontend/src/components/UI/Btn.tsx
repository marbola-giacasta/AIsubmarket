// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// Btn.tsx — animated button with optional marquee text.
//
// When marquee={true} the text scrolls left to right infinitely
// inside the button bounds. I duplicate the text so the scroll
// loops seamlessly without a visible gap or jump.
//
// Animations:
//   hover   → colour inversion + shimmer sweep
//   click   → ripple from click point + scale press
//   marquee → continuous horizontal text scroll
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef, CSSProperties, MouseEvent, TouchEvent } from 'react';

type BtnVariant = 'primary' | 'dark' | 'ghost' | 'blue' | 'gold' | 'danger' | 'admin';

interface BtnProps {
  children:  React.ReactNode;
  onClick?:  () => void;
  type?:     'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?:  BtnVariant;
  style?:    CSSProperties;
  // When true the button text scrolls horizontally in a loop
  marquee?:  boolean;
}

interface Ripple { id: number; x: number; y: number; }

interface VariantStyle {
  bg: string; bgHover: string; color: string; colorHover: string;
  border: string; borderHover: string; shimmer: string; ripple: string;
}

export default function Btn({
  children, onClick, type = 'button', disabled = false,
  variant = 'primary', style: extra = {}, marquee = false,
}: BtnProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const ref = useRef<HTMLButtonElement>(null);
  const v   = VARIANTS[variant];

  function spawnRipple(clientX: number, clientY: number) {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const id   = Date.now();
    setRipples(prev => [...prev, { id, x: clientX - rect.left, y: clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  }

  return (
    <button
      ref={ref} type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={(e: MouseEvent<HTMLButtonElement>) => { setPressed(true); spawnRipple(e.clientX, e.clientY); }}
      onMouseUp={() => setPressed(false)}
      onTouchStart={(e: TouchEvent<HTMLButtonElement>) => { setHovered(true); if (e.touches[0]) spawnRipple(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center',
        // When marquee is on I need a fixed width so text scrolls within bounds
        padding: '9px 20px',
        background:    hovered ? v.bgHover    : v.bg,
        border:        `2px solid ${hovered  ? v.borderHover : v.border}`,
        color:         hovered ? v.colorHover : v.color,
        fontFamily:    'var(--font-display)',
        fontSize:      '13px', letterSpacing: '0.5px',
        cursor:        disabled ? 'not-allowed' : 'pointer',
        opacity:       disabled ? 0.45 : 1,
        transform:     pressed ? 'scale(0.96) translateY(1px)' : 'scale(1)',
        transition:    'background 0.15s, color 0.15s, border-color 0.15s, transform 0.08s',
        userSelect:    'none', touchAction: 'manipulation',
        whiteSpace:    marquee ? 'nowrap' : 'nowrap',
        ...extra,
      }}
    >
      {/* Shimmer sweep on hover */}
      {hovered && !disabled && (
        <span style={{ position:'absolute', inset:0, pointerEvents:'none',
          background: `linear-gradient(105deg,transparent 40%,${v.shimmer} 50%,transparent 60%)`,
          animation: 'shimmer 0.55s ease forwards' }} />
      )}

      {/* Click ripples */}
      {ripples.map(r => (
        <span key={r.id} style={{ position:'absolute', left:r.x, top:r.y,
          width:'6px', height:'6px', borderRadius:'50%', background:v.ripple,
          transform:'translate(-50%,-50%) scale(0)',
          animation:'rippleOut 0.6s ease-out forwards', pointerEvents:'none' }} />
      ))}

      {/* Marquee: duplicate the text and scroll the pair left by 50% */}
      {marquee ? (
        <span style={{
          display:    'flex',
          // Scrolls from current position to -50% (showing the duplicate seamlessly)
          animation:  disabled ? 'none' : 'marqueeScroll 5s linear infinite',
          willChange: 'transform',
        }}>
          {/* First copy */}
          <span style={{ paddingRight: '32px' }}>{children}</span>
          {/* Duplicate — appears as the first copy scrolls out of view */}
          <span style={{ paddingRight: '32px' }}>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

const VARIANTS: Record<BtnVariant, VariantStyle> = {
  primary: { bg:'var(--green)',  bgHover:'#0A0A0A',     color:'#0A0A0A',      colorHover:'var(--green)',  border:'var(--green)',  borderHover:'var(--green)',  shimmer:'rgba(255,255,255,0.35)', ripple:'rgba(0,0,0,0.25)' },
  dark:    { bg:'#0A0A0A',       bgHover:'var(--green)', color:'var(--green)', colorHover:'#0A0A0A',       border:'#0A0A0A',       borderHover:'var(--green)',  shimmer:'rgba(58,255,110,0.25)',  ripple:'rgba(58,255,110,0.3)' },
  ghost:   { bg:'transparent',   bgHover:'#0A0A0A',      color:'#0A0A0A',      colorHover:'#F8F8F8',       border:'#0A0A0A',       borderHover:'#0A0A0A',       shimmer:'rgba(255,255,255,0.2)',  ripple:'rgba(0,0,0,0.15)' },
  blue:    { bg:'transparent',   bgHover:'var(--blue)',  color:'var(--blue)',  colorHover:'#F8F8F8',       border:'var(--blue)',   borderHover:'var(--blue)',   shimmer:'rgba(255,255,255,0.25)', ripple:'rgba(26,92,255,0.25)' },
  gold:    { bg:'transparent',   bgHover:'var(--gold)',  color:'var(--gold)',  colorHover:'#0A0A0A',       border:'var(--gold)',   borderHover:'var(--gold)',   shimmer:'rgba(255,255,255,0.25)', ripple:'rgba(201,147,42,0.3)' },
  danger:  { bg:'transparent',   bgHover:'var(--red)',   color:'var(--red)',   colorHover:'#F8F8F8',       border:'var(--red)',    borderHover:'var(--red)',    shimmer:'rgba(255,255,255,0.2)',  ripple:'rgba(192,57,43,0.2)' },
  admin:   { bg:'var(--gold)',    bgHover:'#0A0A0A',      color:'#0A0A0A',      colorHover:'var(--gold)',   border:'var(--gold)',   borderHover:'var(--gold)',   shimmer:'rgba(255,255,255,0.3)',  ripple:'rgba(0,0,0,0.2)' },
};

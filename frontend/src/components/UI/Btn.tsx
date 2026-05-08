// ─────────────────────────────────────────────────────────────
// Btn.tsx — my animated button component.
// I built this once and reuse it everywhere instead of styling
// plain <button> tags in each component individually.
//
// On hover: background inverts + shimmer sweep slides across.
// On click: ripple expands from the exact click point.
// On press: slight scale-down gives a physical "pressed" feel.
//
// Variants: primary (green), dark, ghost, blue, gold, danger, admin
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef, CSSProperties, MouseEvent, TouchEvent } from 'react';

// All the visual styles a button variant can take
type BtnVariant = 'primary' | 'dark' | 'ghost' | 'blue' | 'gold' | 'danger' | 'admin';

interface BtnProps {
  children:  React.ReactNode;
  onClick?:  () => void;
  type?:     'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?:  BtnVariant;
  style?:    CSSProperties;
}

// Tracks each ripple by its click position and unique id
interface Ripple {
  id: number;
  x:  number;
  y:  number;
}

// All CSS values that differ between variants
interface VariantStyle {
  bg:          string;
  bgHover:     string;
  color:       string;
  colorHover:  string;
  border:      string;
  borderHover: string;
  shimmer:     string; // color of the shimmer sweep highlight
  ripple:      string; // color of the click ripple
}

export default function Btn({
  children,
  onClick,
  type     = 'button',
  disabled = false,
  variant  = 'primary',
  style:   extra = {},
}: BtnProps) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [pressed, setPressed] = useState<boolean>(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const ref = useRef<HTMLButtonElement>(null);

  const v: VariantStyle = VARIANTS[variant];

  function spawnRipple(clientX: number, clientY: number): void {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const id   = Date.now();

    // Position the ripple relative to the button's top-left corner
    setRipples(prev => [...prev, { id, x: clientX - rect.left, y: clientY - rect.top }]);

    // Remove the ripple after its 600ms CSS animation finishes
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  }

  function handleMouseDown(e: MouseEvent<HTMLButtonElement>): void {
    setPressed(true);
    spawnRipple(e.clientX, e.clientY);
  }

  function handleTouchStart(e: TouchEvent<HTMLButtonElement>): void {
    setHovered(true);
    if (e.touches[0]) spawnRipple(e.touches[0].clientX, e.touches[0].clientY);
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={handleMouseDown}
      onMouseUp={() => setPressed(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={() => setHovered(false)}
      style={{
        position:     'relative',
        overflow:     'hidden',
        display:      'inline-flex',
        alignItems:   'center',
        gap:          '8px',
        padding:      '9px 20px',
        background:   hovered ? v.bgHover    : v.bg,
        border:       `2px solid ${hovered  ? v.borderHover : v.border}`,
        color:        hovered ? v.colorHover : v.color,
        fontFamily:   'var(--font-display)',
        fontSize:     '13px',
        letterSpacing:'0.5px',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        opacity:      disabled ? 0.45 : 1,
        transform:    pressed ? 'scale(0.96) translateY(1px)' : 'scale(1)',
        transition:   'background 0.15s, color 0.15s, border-color 0.15s, transform 0.08s',
        userSelect:   'none',
        whiteSpace:   'nowrap',
        touchAction:  'manipulation',
        ...extra,
      }}
    >
      {/* Shimmer sweep — a diagonal highlight that slides across on hover */}
      {hovered && !disabled && (
        <span style={{
          position:      'absolute',
          inset:          0,
          pointerEvents: 'none',
          background:    `linear-gradient(105deg, transparent 40%, ${v.shimmer} 50%, transparent 60%)`,
          animation:     'shimmer 0.55s ease forwards',
        }} />
      )}

      {/* Ripple circles — one per click, expands and fades out */}
      {ripples.map(r => (
        <span key={r.id} style={{
          position:      'absolute',
          left:           r.x,
          top:            r.y,
          width:         '6px',
          height:        '6px',
          borderRadius:  '50%',
          background:     v.ripple,
          transform:     'translate(-50%, -50%) scale(0)',
          animation:     'rippleOut 0.6s ease-out forwards',
          pointerEvents: 'none',
        }} />
      ))}

      {children}
    </button>
  );
}

// I keep all variant definitions here so I can compare them at a glance
const VARIANTS: Record<BtnVariant, VariantStyle> = {
  primary: { bg:'var(--green)',  bgHover:'#0A0A0A',     color:'#0A0A0A',      colorHover:'var(--green)',  border:'var(--green)',  borderHover:'var(--green)',  shimmer:'rgba(255,255,255,0.35)', ripple:'rgba(0,0,0,0.25)' },
  dark:    { bg:'#0A0A0A',       bgHover:'var(--green)', color:'var(--green)', colorHover:'#0A0A0A',       border:'#0A0A0A',       borderHover:'var(--green)',  shimmer:'rgba(58,255,110,0.25)',  ripple:'rgba(58,255,110,0.3)' },
  ghost:   { bg:'transparent',   bgHover:'#0A0A0A',      color:'#0A0A0A',      colorHover:'#F8F8F8',       border:'#0A0A0A',       borderHover:'#0A0A0A',       shimmer:'rgba(255,255,255,0.2)',  ripple:'rgba(0,0,0,0.15)' },
  blue:    { bg:'transparent',   bgHover:'var(--blue)',  color:'var(--blue)',  colorHover:'#F8F8F8',       border:'var(--blue)',   borderHover:'var(--blue)',   shimmer:'rgba(255,255,255,0.25)', ripple:'rgba(26,92,255,0.25)' },
  gold:    { bg:'transparent',   bgHover:'var(--gold)',  color:'var(--gold)',  colorHover:'#0A0A0A',       border:'var(--gold)',   borderHover:'var(--gold)',   shimmer:'rgba(255,255,255,0.25)', ripple:'rgba(201,147,42,0.3)' },
  danger:  { bg:'transparent',   bgHover:'var(--red)',   color:'var(--red)',   colorHover:'#F8F8F8',       border:'var(--red)',    borderHover:'var(--red)',    shimmer:'rgba(255,255,255,0.2)',  ripple:'rgba(192,57,43,0.2)' },
  admin:   { bg:'var(--gold)',    bgHover:'#0A0A0A',      color:'#0A0A0A',      colorHover:'var(--gold)',   border:'var(--gold)',   borderHover:'var(--gold)',   shimmer:'rgba(255,255,255,0.3)',  ripple:'rgba(0,0,0,0.2)' },
};

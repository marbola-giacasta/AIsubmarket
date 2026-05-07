import React, { useState, useRef } from 'react';

/**
 * Animated marker-style button.
 * Variants: 'primary' (green fill), 'dark' (black fill), 'ghost' (outline), 'danger' (red outline)
 */
export default function Btn({ children, onClick, type = 'button', disabled = false, variant = 'primary', style: extraStyle = {} }) {
  const [hovered,  setHovered]  = useState(false);
  const [pressed,  setPressed]  = useState(false);
  const [ripples,  setRipples]  = useState([]);
  const ref = useRef(null);

  const v = VARIANTS[variant] || VARIANTS.primary;

  function handleMouseDown(e) {
    if (disabled) return;
    setPressed(true);
    // spawn ripple
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  }

  const bg     = hovered ? v.bgHover     : v.bg;
  const color  = hovered ? v.colorHover  : v.color;
  const border = hovered ? v.borderHover : v.border;

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
      style={{
        position:       'relative',
        overflow:       'hidden',
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '8px',
        padding:        '9px 20px',
        background:     bg,
        border:         `2px solid ${border}`,
        color,
        fontFamily:     'var(--font-display)',
        fontSize:       '13px',
        letterSpacing:  '0.5px',
        cursor:         disabled ? 'not-allowed' : 'pointer',
        opacity:        disabled ? 0.4 : 1,
        transform:      pressed ? 'scale(0.96) translateY(1px)' : 'scale(1) translateY(0)',
        transition:     'background 0.15s, color 0.15s, border-color 0.15s, transform 0.08s',
        userSelect:     'none',
        whiteSpace:     'nowrap',
        ...extraStyle,
      }}
    >
      {/* Shimmer sweep on hover */}
      {hovered && !disabled && (
        <span style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(105deg, transparent 40%, ${v.shimmer} 50%, transparent 60%)`,
          animation: 'shimmer 0.55s ease forwards',
        }} />
      )}

      {/* Ripple clicks */}
      {ripples.map(r => (
        <span key={r.id} style={{
          position: 'absolute',
          left: r.x, top: r.y,
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: v.ripple,
          transform: 'translate(-50%, -50%) scale(0)',
          animation: 'rippleOut 0.6s ease-out forwards',
          pointerEvents: 'none',
        }} />
      ))}

      {children}
    </button>
  );
}

const VARIANTS = {
  primary: {
    bg:          'var(--green)',
    bgHover:     '#0A0A0A',
    color:       '#0A0A0A',
    colorHover:  'var(--green)',
    border:      'var(--green)',
    borderHover: 'var(--green)',
    shimmer:     'rgba(255,255,255,0.35)',
    ripple:      'rgba(0,0,0,0.25)',
  },
  dark: {
    bg:          '#0A0A0A',
    bgHover:     'var(--green)',
    color:       'var(--green)',
    colorHover:  '#0A0A0A',
    border:      '#0A0A0A',
    borderHover: 'var(--green)',
    shimmer:     'rgba(58,255,110,0.25)',
    ripple:      'rgba(58,255,110,0.3)',
  },
  ghost: {
    bg:          'transparent',
    bgHover:     '#0A0A0A',
    color:       '#0A0A0A',
    colorHover:  '#F8F8F8',
    border:      '#0A0A0A',
    borderHover: '#0A0A0A',
    shimmer:     'rgba(255,255,255,0.2)',
    ripple:      'rgba(0,0,0,0.15)',
  },
  gold: {
    bg:          'transparent',
    bgHover:     'var(--gold)',
    color:       'var(--gold)',
    colorHover:  '#0A0A0A',
    border:      'var(--gold)',
    borderHover: 'var(--gold)',
    shimmer:     'rgba(255,255,255,0.25)',
    ripple:      'rgba(201,147,42,0.3)',
  },
  blue: {
    bg:          'transparent',
    bgHover:     'var(--blue)',
    color:       'var(--blue)',
    colorHover:  '#F8F8F8',
    border:      'var(--blue)',
    borderHover: 'var(--blue)',
    shimmer:     'rgba(255,255,255,0.25)',
    ripple:      'rgba(26,92,255,0.25)',
  },
  danger: {
    bg:          'transparent',
    bgHover:     'var(--red)',
    color:       'var(--red)',
    colorHover:  '#F8F8F8',
    border:      'var(--red)',
    borderHover: 'var(--red)',
    shimmer:     'rgba(255,255,255,0.2)',
    ripple:      'rgba(192,57,43,0.2)',
  },
};

// append blue variant

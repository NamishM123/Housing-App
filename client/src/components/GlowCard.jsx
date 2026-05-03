import { useEffect, useRef } from 'react';

const COLOR_MAP = {
  blue:   { hue: 210 },
  purple: { hue: 280 },
  green:  { hue: 140 },
  red:    { hue: 0 },
  orange: { hue: 30 },
};

let injected = false;
function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const css = `
    .glow-card {
      position: relative;
      isolation: isolate;
      background-color: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: border-color 0.25s ease;
    }
    .glow-card:hover {
      border-color: rgba(255, 255, 255, 0.18);
    }
    .glow-card::before,
    .glow-card::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      opacity: var(--glow-active, 0);
      transition: opacity 0.35s ease;
    }
    /* Inner soft spotlight on the card surface */
    .glow-card::before {
      background: radial-gradient(
        var(--glow-size, 220px) var(--glow-size, 220px) at var(--glow-x, 50%) var(--glow-y, 50%),
        hsla(var(--glow-hue, 210), 95%, 70%, 0.22),
        hsla(var(--glow-hue, 210), 95%, 70%, 0.08) 35%,
        transparent 70%
      );
      z-index: 0;
    }
    /* Glowing border ring — built with mask-composite: exclude */
    .glow-card::after {
      padding: var(--glow-border, 2px);
      background: radial-gradient(
        var(--glow-size, 220px) var(--glow-size, 220px) at var(--glow-x, 50%) var(--glow-y, 50%),
        hsla(var(--glow-hue, 210), 100%, 75%, 1),
        hsla(var(--glow-hue, 210), 100%, 70%, 0.5) 30%,
        transparent 70%
      );
      -webkit-mask:
        linear-gradient(#000 0 0) content-box,
        linear-gradient(#000 0 0);
      mask:
        linear-gradient(#000 0 0) content-box,
        linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      z-index: 1;
      filter: brightness(1.15);
    }
    .glow-card > * {
      position: relative;
      z-index: 2;
    }
  `;
  const style = document.createElement('style');
  style.setAttribute('data-glow-card-styles', '');
  style.textContent = css;
  document.head.appendChild(style);
}

const GlowCard = ({
  children,
  className = '',
  style = {},
  glowColor = 'blue',
  radius = 14,
  border = 2,
  size = 220,
  as: Tag = 'div',
  ...rest
}) => {
  const cardRef = useRef(null);

  useEffect(() => {
    injectStyles();
    const el = cardRef.current;
    if (!el) return;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--glow-x', `${x}px`);
      el.style.setProperty('--glow-y', `${y}px`);
      el.style.setProperty('--glow-active', '1');
    };
    const onLeave = () => {
      el.style.setProperty('--glow-active', '0');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerenter', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const { hue } = COLOR_MAP[glowColor] || COLOR_MAP.blue;

  const inlineVars = {
    '--glow-hue': hue,
    '--glow-size': `${size}px`,
    '--glow-border': `${border}px`,
    '--glow-active': 0,
    '--glow-x': '50%',
    '--glow-y': '50%',
    borderRadius: `${radius}px`,
    ...style,
  };

  return (
    <Tag
      ref={cardRef}
      style={inlineVars}
      className={`glow-card ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export { GlowCard };

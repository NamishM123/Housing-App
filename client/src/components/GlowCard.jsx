import { useEffect, useRef } from 'react';

const COLOR_MAP = {
  blue:   { base: 210, spread: 30 },
  purple: { base: 280, spread: 60 },
  green:  { base: 140, spread: 40 },
  red:    { base: 0,   spread: 30 },
  orange: { base: 30,  spread: 30 },
};

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
    const el = cardRef.current;
    if (!el) return;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--x', x.toFixed(2));
      el.style.setProperty('--y', y.toFixed(2));
      el.style.setProperty('--xp', (x / rect.width).toFixed(2));
      el.style.setProperty('--active', '1');
    };
    const onLeave = () => {
      el.style.setProperty('--active', '0');
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

  const { base, spread } = COLOR_MAP[glowColor] || COLOR_MAP.blue;

  const inlineVars = {
    '--base': base,
    '--spread': spread,
    '--radius': radius,
    '--border': border,
    '--size': size,
    '--active': 0,
    '--border-size': 'calc(var(--border) * 1px)',
    '--spotlight-size': 'calc(var(--size) * 1px)',
    '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread)))',
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, -999) * 1px) calc(var(--y, -999) * 1px),
      hsl(var(--hue, 210) 80% 65% / calc(0.10 * var(--active, 0))),
      transparent
    )`,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    backgroundRepeat: 'no-repeat',
    border: 'var(--border-size) solid rgba(255, 255, 255, 0.07)',
    borderRadius: 'calc(var(--radius) * 1px)',
    position: 'relative',
    touchAction: 'none',
    backdropFilter: 'blur(8px)',
    transition: 'border-color 0.25s ease',
    ...style,
  };

  return (
    <>
      <style>{`
        [data-glow]::before,
        [data-glow]::after {
          pointer-events: none;
          content: "";
          position: absolute;
          inset: calc(var(--border-size) * -1);
          border: var(--border-size) solid transparent;
          border-radius: calc(var(--radius) * 1px);
          background-repeat: no-repeat;
          mask:
            linear-gradient(transparent, transparent),
            linear-gradient(white, white);
          mask-clip: padding-box, border-box;
          mask-composite: intersect;
          opacity: var(--active, 0);
          transition: opacity 0.25s ease;
        }
        [data-glow]::before {
          background-image: radial-gradient(
            calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
            calc(var(--x, -999) * 1px) calc(var(--y, -999) * 1px),
            hsl(var(--hue, 210) 85% 60% / 0.95), transparent 100%
          );
          filter: brightness(1.6);
        }
        [data-glow]::after {
          background-image: radial-gradient(
            calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
            calc(var(--x, -999) * 1px) calc(var(--y, -999) * 1px),
            hsl(0 0% 100% / 0.85), transparent 100%
          );
        }
      `}</style>
      <Tag
        ref={cardRef}
        data-glow=""
        style={inlineVars}
        className={`glow-card ${className}`}
        {...rest}
      >
        {children}
      </Tag>
    </>
  );
};

export { GlowCard };

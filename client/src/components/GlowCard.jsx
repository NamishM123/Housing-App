import { useEffect, useRef } from 'react';

const GlowCard = ({ children, className = '', style = {} }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const sync = (e) => {
      if (!cardRef.current) return;
      cardRef.current.style.setProperty('--x', e.clientX.toFixed(2));
      cardRef.current.style.setProperty('--xp', (e.clientX / window.innerWidth).toFixed(2));
      cardRef.current.style.setProperty('--y', e.clientY.toFixed(2));
      cardRef.current.style.setProperty('--yp', (e.clientY / window.innerHeight).toFixed(2));
    };
    document.addEventListener('pointermove', sync);
    return () => document.removeEventListener('pointermove', sync);
  }, []);

  return (
    <>
      <style>{`
        .glow-card::before,
        .glow-card::after {
          pointer-events: none;
          content: "";
          position: absolute;
          inset: calc(var(--border-size) * -1);
          border: var(--border-size) solid transparent;
          border-radius: calc(var(--radius) * 1px);
          background-attachment: fixed;
          background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
          background-repeat: no-repeat;
          background-position: 50% 50%;
          mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
          mask-clip: padding-box, border-box;
          mask-composite: intersect;
        }
        .glow-card::before {
          background-image: radial-gradient(
            calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
            calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),
            hsl(var(--hue) 80% 55% / 0.9), transparent 100%
          );
          filter: brightness(2);
        }
        .glow-card::after {
          background-image: radial-gradient(
            calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
            calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),
            hsl(0 100% 100% / 0.8), transparent 100%
          );
        }
        .glow-card .glow-inner {
          position: absolute;
          inset: 0;
          will-change: filter;
          border-radius: calc(var(--radius) * 1px);
          filter: blur(calc(var(--border-size) * 10));
          background: none;
          pointer-events: none;
          border: none;
        }
      `}</style>
      <div
        ref={cardRef}
        className={`glow-card ${className}`}
        style={{
          '--base': 210,
          '--spread': 30,
          '--radius': '14',
          '--border': '2',
          '--size': '200',
          '--border-size': 'calc(var(--border) * 1px)',
          '--spotlight-size': 'calc(var(--size) * 1px)',
          '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
          backgroundImage: `radial-gradient(
            var(--spotlight-size) var(--spotlight-size) at
            calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),
            hsl(var(--hue) 80% 65% / 0.08), transparent
          )`,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
          backgroundPosition: '50% 50%',
          backgroundAttachment: 'fixed',
          border: 'var(--border-size) solid rgba(255,255,255,0.08)',
          borderRadius: 'calc(var(--radius) * 1px)',
          position: 'relative',
          touchAction: 'none',
          backdropFilter: 'blur(10px)',
          ...style,
        }}
      >
        <div className="glow-inner" />
        {children}
      </div>
    </>
  );
};

export { GlowCard };

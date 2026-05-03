import { useEffect, useRef } from 'react';

const GlowCard = ({ children, className = '', style = {} }) => {
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
    };

    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <>
      <style>{`
        .glow-card {
          --base: 210;
          --spread: 30;
          --radius: 18;
          --border: 1.5;
          --size: 260;
          --border-size: calc(var(--border) * 1px);
          --spotlight-size: calc(var(--size) * 1px);
          --hue: calc(var(--base) + (var(--xp, 0) * var(--spread)));
          position: relative;
          border-radius: calc(var(--radius) * 1px);
          border: var(--border-size) solid rgba(255, 255, 255, 0.08);
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(10px);
          background-image: radial-gradient(
            var(--spotlight-size) var(--spotlight-size) at
            calc(var(--x, -9999) * 1px) calc(var(--y, -9999) * 1px),
            hsl(var(--hue) 80% 65% / 0.10),
            transparent
          );
          background-repeat: no-repeat;
          touch-action: none;
        }
        .glow-card::before,
        .glow-card::after {
          pointer-events: none;
          content: "";
          position: absolute;
          inset: calc(var(--border-size) * -1);
          border: var(--border-size) solid transparent;
          border-radius: calc(var(--radius) * 1px);
          background-repeat: no-repeat;
          mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
          mask-clip: padding-box, border-box;
          mask-composite: intersect;
        }
        .glow-card::before {
          background-image: radial-gradient(
            calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
            calc(var(--x, -9999) * 1px) calc(var(--y, -9999) * 1px),
            hsl(var(--hue) 85% 60% / 0.95), transparent 100%
          );
          filter: brightness(1.6);
        }
        .glow-card::after {
          background-image: radial-gradient(
            calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
            calc(var(--x, -9999) * 1px) calc(var(--y, -9999) * 1px),
            hsl(0 0% 100% / 0.85), transparent 100%
          );
        }
      `}</style>
      <div ref={cardRef} className={`glow-card ${className}`} style={style}>
        {children}
      </div>
    </>
  );
};

export { GlowCard };

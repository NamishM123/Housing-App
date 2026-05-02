import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import './LandingPage.css';

/**
 * Landing sequence (single canvas rendering pipeline — zero seams):
 *  1. Stars only with Rolls-Royce-style varied shooting stars (~3.2s)
 *  2. Text-in: SAME particle cloud expands from scale 0.55 → 1.0 with
 *     opacity 0 → 1 (fade-in + grow-out from center)
 *  3. Hold (1s) — solid-looking text made of dense fine particles
 *  4. Particle Text Dissolve (AE-style): slow right-to-left wave releases
 *     particles one by one; each drifts right with mild randomness and
 *     fades over a long tail
 *  5. After dissolve, dashboard
 *
 * Everything from text-in onward is drawn the same way (particles), so
 * there is no visual jump between phases.
 */

function StarField() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.008;
      ref.current.rotation.x += delta * 0.003;
    }
  });
  return (
    <group ref={ref}>
      <Stars radius={100} depth={50} count={1600} factor={7}   saturation={0.3} fade speed={0.5} />
      <Stars radius={140} depth={70} count={9000} factor={3.0} saturation={0.5} fade speed={0.7} />
    </group>
  );
}

const TEXT             = 'Welcome to Settlr';
const FONT_FAMILY      = "'Montserrat', 'Helvetica Neue', system-ui, sans-serif";
const FONT_WEIGHT      = 300;
const SAMPLE_STEP      = 1;            // every pixel — looks fully solid

// Phase timing (ms)
const T_STARS_ONLY      = 3200;
const T_TEXT_IN         = 1800;        // particle cloud scales+fades in
const T_HOLD            = 1000;
const T_SNAP            = 3600;        // long AE-style dissolve
const T_DISMISS_FADE    = 900;

// Easing
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

export default function LandingPage({ onComplete }) {
  const overlayRef    = useRef(null);
  const animRef       = useRef(null);
  const particlesRef  = useRef([]);
  const centerRef     = useRef({ x: 0, y: 0 });
  const phaseRef      = useRef('stars');     // stars → text-in → hold → snap → done
  const phaseStartRef = useRef(performance.now());

  const [blurStars,  setBlurStars]  = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // ---------- Build particle cloud from text raster ----------
  function buildParticles(W, H) {
    const fontSize = Math.max(40, Math.min(96, Math.floor(W * 0.046)));
    const padding = 60;

    // Measure
    const m = document.createElement('canvas').getContext('2d');
    m.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`;
    const letterSpacing = fontSize * 0.06;
    const widths = [...TEXT].map(ch => m.measureText(ch).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + letterSpacing * (TEXT.length - 1);

    const off = document.createElement('canvas');
    off.width  = Math.ceil(totalWidth + padding * 2);
    off.height = Math.ceil(fontSize * 1.6);
    const octx = off.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`;
    octx.textBaseline = 'middle';

    let cursor = padding;
    for (let i = 0; i < TEXT.length; i++) {
      octx.fillText(TEXT[i], cursor, off.height / 2);
      cursor += widths[i] + letterSpacing;
    }

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const cx = W / 2;
    const cy = H / 2;
    const offX = -off.width / 2;
    const offY = -off.height / 2;

    const ps = [];
    for (let y = 0; y < off.height; y += SAMPLE_STEP) {
      for (let x = 0; x < off.width; x += SAMPLE_STEP) {
        const idx = (y * off.width + x) * 4;
        const a = data[idx + 3];
        if (a > 50) {
          // Mixed grain sizes — most 1px, some chunkier
          const r = Math.random();
          const size = r < 0.74 ? 1
                     : r < 0.92 ? 1.5
                     : r < 0.98 ? 2.2
                     : 3.0;

          // Spider-Man / AE wave: rightmost pixels release first
          const distFromRight = 1 - (x / off.width);     // 0 at right → 1 at left
          const waveStart = distFromRight * 0.72;        // covers 0..0.72
          const jitter = (Math.random() - 0.3) * 0.20;
          const snapDelay = Math.max(0, Math.min(0.88, waveStart + jitter));

          const speedBoost = size > 1.5 ? 0.4 + Math.random() * 0.6 : 0;

          ps.push({
            // Offset from text center (used for scaled rendering pre-snap)
            dx: offX + x,
            dy: offY + y,
            size,
            // Source alpha from the rasterized glyph (preserves antialiasing edges)
            alphaSrc: a / 255,
            alphaBase: 0.85 + Math.random() * 0.15,
            snapDelay,
            decay: 0.9 + Math.random() * 0.5,
            // Post-release state
            released: false,
            px: 0, py: 0,
            vx: 0.9 + Math.random() * 2.5 + speedBoost,
            vy: (Math.random() - 0.5) * 0.7 - 0.10,
            // Per-particle slight position jitter so it doesn't look gridded
            jx: (Math.random() - 0.5) * 0.4,
            jy: (Math.random() - 0.5) * 0.4,
          });
        }
      }
    }

    particlesRef.current = ps;
    centerRef.current = { x: cx, y: cy };
  }

  // ---------- Animation loop ----------
  useEffect(() => {
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const shootingStars = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Reposition the particle cloud's center for the new viewport
      if (particlesRef.current.length) {
        centerRef.current = { x: W / 2, y: H / 2 };
      }
    }

    // Wait for Montserrat before sampling glyphs (otherwise fallback metrics)
    const ready = (document.fonts && document.fonts.load)
      ? document.fonts.load(`${FONT_WEIGHT} 64px ${FONT_FAMILY}`).then(() => {
          if (W && H) buildParticles(W, H);
        })
      : Promise.resolve();

    function spawnShootingStar() {
      const profile = Math.random();
      let tailLen, speed, life, lineWidth;
      if (profile < 0.45) {
        tailLen = 25 + Math.random() * 35;
        speed   = 7  + Math.random() * 5;
        life    = 28 + Math.random() * 18;
        lineWidth = 0.8;
      } else if (profile < 0.85) {
        tailLen = 70 + Math.random() * 80;
        speed   = 4  + Math.random() * 3;
        life    = 80 + Math.random() * 60;
        lineWidth = 1.0;
      } else {
        tailLen = 180 + Math.random() * 140;
        speed   = 2.0 + Math.random() * 1.6;
        life    = 220 + Math.random() * 140;
        lineWidth = 1.2;
      }
      const angle = Math.random() * Math.PI * 2 + Math.PI * 0.05;
      shootingStars.push({
        x: -50 + Math.random() * (W + 100),
        y: -50 + Math.random() * (H * 0.7 + 100),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        tailLen, life: 0, maxLife: life, lineWidth,
        hue: Math.random() < 0.7 ? 'rgba(255, 245, 225,' : 'rgba(220, 230, 255,',
      });
    }

    let lastShoot = performance.now() - 1000;
    let nextShootIn = 400 + Math.random() * 600;

    function frame(now) {
      ctx.clearRect(0, 0, W, H);

      // --- Shooting stars ---
      if (now - lastShoot > nextShootIn) {
        spawnShootingStar();
        if (Math.random() < 0.3) setTimeout(spawnShootingStar, 200 + Math.random() * 400);
        lastShoot = now;
        nextShootIn = 600 + Math.random() * 1800;
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const sh = shootingStars[i];
        sh.x += sh.vx; sh.y += sh.vy; sh.life++;
        const lr = sh.life / sh.maxLife;
        const fade = lr < 0.12 ? lr / 0.12
                  : lr > 0.7  ? Math.max(0, 1 - (lr - 0.7) / 0.3)
                  : 1;
        const sp = Math.hypot(sh.vx, sh.vy) || 1;
        const ux = sh.vx / sp, uy = sh.vy / sp;
        const tailX = sh.x - ux * sh.tailLen;
        const tailY = sh.y - uy * sh.tailLen;
        const grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
        grad.addColorStop(0,   sh.hue + '0)');
        grad.addColorStop(0.6, sh.hue + (0.18 * fade) + ')');
        grad.addColorStop(1,   sh.hue + (0.95 * fade) + ')');
        ctx.strokeStyle = grad;
        ctx.lineWidth = sh.lineWidth;
        ctx.lineCap   = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(sh.x, sh.y);
        ctx.stroke();
        const headG = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 3);
        headG.addColorStop(0, sh.hue + (0.7 * fade) + ')');
        headG.addColorStop(1, sh.hue + '0)');
        ctx.fillStyle = headG;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 3, 0, Math.PI * 2);
        ctx.fill();
        if (sh.life >= sh.maxLife || sh.x < -200 || sh.x > W + 200 || sh.y > H + 200 || sh.y < -200) {
          shootingStars.splice(i, 1);
        }
      }

      // --- Phase machine ---
      const phase = phaseRef.current;
      const elapsed = now - phaseStartRef.current;

      if (phase === 'stars' && elapsed >= T_STARS_ONLY) {
        phaseRef.current = 'text-in';
        phaseStartRef.current = now;
      } else if (phase === 'text-in' && elapsed >= T_TEXT_IN) {
        phaseRef.current = 'hold';
        phaseStartRef.current = now;
      } else if (phase === 'hold' && elapsed >= T_HOLD) {
        setBlurStars(true);
        phaseRef.current = 'snap';
        phaseStartRef.current = now;
      } else if (phase === 'snap' && elapsed >= T_SNAP) {
        phaseRef.current = 'done';
        setDismissing(true);
        setTimeout(() => onComplete?.(), T_DISMISS_FADE);
      }

      // --- Render text particles (single pipeline through all text phases) ---
      const ps = particlesRef.current;
      if (ps.length && (phase === 'text-in' || phase === 'hold' || phase === 'snap')) {
        const { x: cx, y: cy } = centerRef.current;

        if (phase === 'text-in') {
          const t = Math.min(1, elapsed / T_TEXT_IN);
          const eased = easeOutCubic(t);
          const scale = 0.55 + (1.0 - 0.55) * eased;
          const op    = Math.min(1, t * 1.15);
          for (const p of ps) {
            const a = op * p.alphaSrc * p.alphaBase;
            ctx.fillStyle = `rgba(244, 241, 232, ${a})`;
            ctx.fillRect(cx + p.dx * scale + p.jx, cy + p.dy * scale + p.jy, p.size, p.size);
          }
        } else if (phase === 'hold') {
          for (const p of ps) {
            const a = p.alphaSrc * p.alphaBase;
            ctx.fillStyle = `rgba(244, 241, 232, ${a})`;
            ctx.fillRect(cx + p.dx + p.jx, cy + p.dy + p.jy, p.size, p.size);
          }
        } else if (phase === 'snap') {
          const t = elapsed / T_SNAP;
          for (const p of ps) {
            if (t <= p.snapDelay) {
              // Still part of solid text
              const a = p.alphaSrc * p.alphaBase;
              ctx.fillStyle = `rgba(244, 241, 232, ${a})`;
              ctx.fillRect(cx + p.dx + p.jx, cy + p.dy + p.jy, p.size, p.size);
              continue;
            }
            // Released
            if (!p.released) {
              p.released = true;
              p.px = cx + p.dx + p.jx;
              p.py = cy + p.dy + p.jy;
            }
            p.px += p.vx;
            p.py += p.vy;
            p.vx *= 0.992;
            p.vy *= 0.992;
            const localT = (t - p.snapDelay) / (1 - p.snapDelay);
            const fade = Math.max(0, 1 - localT * p.decay);
            const a = p.alphaSrc * p.alphaBase * fade;
            if (a > 0.005) {
              ctx.fillStyle = `rgba(244, 241, 232, ${a})`;
              ctx.fillRect(p.px, p.py, p.size, p.size);
            }
          }
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    phaseStartRef.current = performance.now();
    animRef.current = requestAnimationFrame(frame);
    ready.then(() => {
      // Re-sample once font is loaded
      if (W && H) buildParticles(W, H);
    });

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete]);

  return (
    <div className={`landing-root ${dismissing ? 'dismissing' : ''}`}>
      <div className={`landing-three ${blurStars ? 'blur' : ''}`}>
        <Canvas
          camera={{ position: [0, 0, 1], fov: 75 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: 'radial-gradient(ellipse at center, #060814 0%, #02030a 60%, #000 100%)' }}
        >
          <StarField />
        </Canvas>
      </div>

      <canvas ref={overlayRef} className="landing-overlay" />

      <button
        className="landing-skip-btn"
        onClick={() => onComplete?.()}
        type="button"
      >
        Skip to Dashboard →
      </button>
    </div>
  );
}

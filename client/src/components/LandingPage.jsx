import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import './LandingPage.css';

/**
 * Cinematic landing sequence:
 *  1. Realistic 3D starfield (R3F + drei) — stars only for ~3.2s
 *  2. Particles spawn scattered outward, converge to form "Welcome to Settlr"
 *     in Montserrat Light
 *  3. Hold briefly
 *  4. Thanos snap: particles disintegrate, drift right & up, fade out
 *  5. After snap completes → dismiss → onComplete fires → dashboard
 */

function StarField() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.01;
      ref.current.rotation.x += delta * 0.003;
    }
  });
  return (
    <group ref={ref}>
      <Stars radius={120} depth={60} count={9000} factor={3.2} saturation={0.4} fade speed={0.6} />
    </group>
  );
}

const TEXT             = 'Welcome to Settlr';
const FONT_STACK       = "'Montserrat', 'Helvetica Neue', system-ui, sans-serif";
const FONT_WEIGHT      = 300;       // Light
const LETTER_SPACING   = '0.06em';  // closer together
const SAMPLE_STEP      = 3;         // smaller = denser particle text

// Phase timing (ms)
const T_HOLD_BEFORE     = 3200;     // stars-only phase (was 2200, +1s)
const T_CONVERGE        = 1600;     // particles fly in to form text
const T_HOLD_TEXT       = 1100;     // text sits visible
const T_SNAP            = 2500;     // disintegrate
const T_DISMISS_FADE    = 900;      // landing fade out

export default function LandingPage({ onComplete }) {
  const overlayRef    = useRef(null);
  const animRef       = useRef(null);
  const particlesRef  = useRef([]);
  const phaseRef      = useRef('stars');     // stars → converge → hold → snap → done
  const phaseStartRef = useRef(performance.now());

  const [blurStars, setBlurStars]   = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // ---------- Build particle target positions for the text ----------
  function buildParticles(W, H) {
    // Render text into an offscreen canvas, sample opaque pixels → targets
    const off = document.createElement('canvas');
    const fontSize = Math.max(36, Math.min(96, Math.floor(W * 0.045)));
    const padding = 80;

    // Measure first
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_STACK}`;
    // Letter-spacing isn't natively supported on canvas — we draw letter-by-letter
    const letterSpacing = fontSize * 0.06;
    const widths = [...TEXT].map(ch => measure.measureText(ch).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + letterSpacing * (TEXT.length - 1);

    off.width  = Math.ceil(totalWidth + padding * 2);
    off.height = Math.ceil(fontSize * 1.6);
    const octx = off.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_STACK}`;
    octx.textBaseline = 'middle';

    let cursor = padding;
    for (let i = 0; i < TEXT.length; i++) {
      octx.fillText(TEXT[i], cursor, off.height / 2);
      cursor += widths[i] + letterSpacing;
    }

    // Sample
    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const cx = W / 2;
    const cy = H / 2;
    const offsetX = -off.width / 2;
    const offsetY = -off.height / 2;

    const ps = [];
    for (let y = 0; y < off.height; y += SAMPLE_STEP) {
      for (let x = 0; x < off.width; x += SAMPLE_STEP) {
        const idx = (y * off.width + x) * 4;
        if (data[idx + 3] > 128) {
          const tx = cx + offsetX + x;
          const ty = cy + offsetY + y;
          // Start position: scattered radially outward from target
          const angle = Math.random() * Math.PI * 2;
          const dist  = 220 + Math.random() * 380;
          const sx = tx + Math.cos(angle) * dist;
          const sy = ty + Math.sin(angle) * dist;
          ps.push({
            x: sx, y: sy,
            sx, sy, tx, ty,
            // snap velocities, set when phase=snap
            vx: 0, vy: 0,
            size: 1.0 + Math.random() * 1.0,
            baseAlpha: 0.7 + Math.random() * 0.3,
            // for converge motion easing
            convergeDelay: Math.random() * 0.35,    // 0..0.35 fraction of T_CONVERGE
            // snap fade timing
            snapDelay: Math.random() * 0.5,         // 0..0.5 of T_SNAP
            snapped: false,
            twinkle: Math.random() * Math.PI * 2,
          });
        }
      }
    }
    particlesRef.current = ps;
  }

  // ---------- Main animation loop ----------
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
      // Rebuild particle positions if we already have them (so they fit new size)
      if (particlesRef.current.length === 0) buildParticles(W, H);
    }

    function spawnShootingStar() {
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? -50 : W + 50;
      const startY = Math.random() * H * 0.6;
      const angle  = (fromLeft ? 1 : -1) * (0.18 + Math.random() * 0.12);
      const speed  = 1.4 + Math.random() * 1.6;
      shootingStars.push({
        x: startX, y: startY,
        vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
        vy: Math.sin(angle) * speed,
        life: 0, maxLife: 220 + Math.random() * 160, trail: [],
      });
    }

    let lastShoot = performance.now();
    let nextShootIn = 1500 + Math.random() * 2000;

    // Wait for Montserrat to load before sampling, so target positions match the rendered glyphs
    const ready = (document.fonts && document.fonts.load)
      ? document.fonts.load(`${FONT_WEIGHT} 64px ${FONT_STACK}`).then(() => {
          if (W && H) {
            particlesRef.current = [];
            buildParticles(W, H);
          }
        })
      : Promise.resolve();

    function frame(now) {
      ctx.clearRect(0, 0, W, H);

      // --- Shooting stars (always running) ---
      if (now - lastShoot > nextShootIn) {
        spawnShootingStar();
        if (Math.random() < 0.25) setTimeout(spawnShootingStar, 250);
        lastShoot = now;
        nextShootIn = 1800 + Math.random() * 2800;
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const sh = shootingStars[i];
        sh.x += sh.vx; sh.y += sh.vy; sh.life++;
        sh.trail.push({ x: sh.x, y: sh.y });
        if (sh.trail.length > 30) sh.trail.shift();
        const lr = sh.life / sh.maxLife;
        const fade = lr < 0.15 ? lr / 0.15 : lr > 0.7 ? Math.max(0, 1 - (lr - 0.7) / 0.3) : 1;
        for (let j = 0; j < sh.trail.length; j++) {
          const p = sh.trail[j];
          const a = (j / sh.trail.length) * 0.85 * fade;
          ctx.fillStyle = `rgba(255, 240, 220, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.6 + (j / sh.trail.length) * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        const headG = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 10);
        headG.addColorStop(0, `rgba(255, 250, 235, ${1.0 * fade})`);
        headG.addColorStop(1, `rgba(255, 250, 235, 0)`);
        ctx.fillStyle = headG;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 10, 0, Math.PI * 2);
        ctx.fill();
        if (sh.life >= sh.maxLife || sh.x < -100 || sh.x > W + 100 || sh.y > H + 100) {
          shootingStars.splice(i, 1);
        }
      }

      // --- Phase machine ---
      const phase = phaseRef.current;
      const elapsed = now - phaseStartRef.current;

      if (phase === 'stars' && elapsed >= T_HOLD_BEFORE) {
        phaseRef.current = 'converge';
        phaseStartRef.current = now;
      } else if (phase === 'converge' && elapsed >= T_CONVERGE) {
        // Snap particles to targets exactly
        for (const p of particlesRef.current) { p.x = p.tx; p.y = p.ty; }
        phaseRef.current = 'hold';
        phaseStartRef.current = now;
      } else if (phase === 'hold' && elapsed >= T_HOLD_TEXT) {
        // Begin Thanos snap — assign rightward drift velocities
        const ps = particlesRef.current;
        const cx = W / 2;
        for (const p of ps) {
          // Particles further right snap first (looks like wave from left to right? actually thanos is more random)
          // Use random delay already set; velocity rightward + slight random vertical
          p.vx = 1.6 + Math.random() * 2.6;
          p.vy = (Math.random() - 0.5) * 0.7 - 0.15;   // slight upward drift
          // Slight position jitter to feel like crumbling
          p.x += (Math.random() - 0.5) * 0.5;
          p.y += (Math.random() - 0.5) * 0.5;
          // Distance-from-center small influence on delay (right-side leaves first feels Thanos-y)
          const distFromLeftEdge = (p.tx) / W;     // 0..1
          p.snapDelay = (1 - distFromLeftEdge) * 0.4 + Math.random() * 0.4;   // wave from right to left
        }
        setBlurStars(true);
        phaseRef.current = 'snap';
        phaseStartRef.current = now;
      } else if (phase === 'snap' && elapsed >= T_SNAP) {
        phaseRef.current = 'done';
        setDismissing(true);
        setTimeout(() => onComplete?.(), T_DISMISS_FADE);
      }

      // --- Render particles based on phase ---
      const ps = particlesRef.current;
      if (ps.length && (phase === 'converge' || phase === 'hold' || phase === 'snap')) {
        if (phase === 'converge') {
          const t = Math.min(1, elapsed / T_CONVERGE);
          for (const p of ps) {
            // Per-particle delayed start, eased-out
            const local = Math.max(0, Math.min(1, (t - p.convergeDelay) / (1 - p.convergeDelay)));
            const eased = 1 - Math.pow(1 - local, 3);    // easeOutCubic
            p.x = p.sx + (p.tx - p.sx) * eased;
            p.y = p.sy + (p.ty - p.sy) * eased;
            const alpha = Math.min(1, local * 1.2) * p.baseAlpha;
            const tw = 0.85 + 0.15 * Math.sin(now * 0.004 + p.twinkle);
            ctx.fillStyle = `rgba(244, 241, 232, ${alpha * tw})`;
            ctx.fillRect(p.x, p.y, p.size, p.size);
          }
        } else if (phase === 'hold') {
          for (const p of ps) {
            const tw = 0.88 + 0.12 * Math.sin(now * 0.004 + p.twinkle);
            ctx.fillStyle = `rgba(244, 241, 232, ${p.baseAlpha * tw})`;
            ctx.fillRect(p.x, p.y, p.size, p.size);
          }
        } else if (phase === 'snap') {
          const t = elapsed / T_SNAP;
          for (const p of ps) {
            const local = Math.max(0, (t - p.snapDelay) / (1 - p.snapDelay));
            if (local <= 0) {
              // Hasn't started snapping yet — still solid
              ctx.fillStyle = `rgba(244, 241, 232, ${p.baseAlpha})`;
              ctx.fillRect(p.x, p.y, p.size, p.size);
              continue;
            }
            // Drift + slow down
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.992;
            p.vy *= 0.992;
            const alpha = Math.max(0, 1 - local) * p.baseAlpha;
            ctx.fillStyle = `rgba(244, 241, 232, ${alpha})`;
            ctx.fillRect(p.x, p.y, p.size, p.size);
          }
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    phaseStartRef.current = performance.now();
    animRef.current = requestAnimationFrame(frame);
    // Re-sample once font loads (in case fallback rendered first)
    ready.then(() => {});

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

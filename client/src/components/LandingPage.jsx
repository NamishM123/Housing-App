import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import './LandingPage.css';

/**
 * Cinematic landing sequence:
 *  1. Realistic 3D starfield + Rolls-Royce-style varied shooting stars
 *  2. After ~3.2s, "Welcome to Settlr" fades in (opacity 0→1) while
 *     scaling out from the middle
 *  3. Brief hold
 *  4. Thanos snap — text rasterized to particles that drift right and fade
 *  5. After snap, dashboard is revealed
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
      {/* Two layers: sparser big stars + denser small stars */}
      <Stars radius={100} depth={50} count={1600} factor={7}   saturation={0.3} fade speed={0.5} />
      <Stars radius={140} depth={70} count={9000} factor={3.0} saturation={0.5} fade speed={0.7} />
    </group>
  );
}

const TEXT             = 'Welcome to Settlr';
const FONT_STACK       = "'Montserrat', 'Helvetica Neue', system-ui, sans-serif";
const FONT_WEIGHT      = 300;
const SAMPLE_STEP      = 3;

// Phase timing (ms)
const T_STARS_ONLY      = 3200;     // stars-only intro
const T_TEXT_IN         = 1800;     // fade + scale in
const T_HOLD_TEXT       = 1300;     // hold
const T_SNAP            = 2500;     // Thanos snap
const T_DISMISS_FADE    = 900;

export default function LandingPage({ onComplete }) {
  const overlayRef    = useRef(null);
  const textRef       = useRef(null);
  const animRef       = useRef(null);
  const particlesRef  = useRef([]);
  const phaseRef      = useRef('stars');     // stars → text-in → hold → snap → done
  const phaseStartRef = useRef(performance.now());

  const [textPhase,  setTextPhase]  = useState('hidden');   // hidden → in → snap
  const [blurStars,  setBlurStars]  = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // ---------- Build dissolve particles by sampling DOM text ----------
  function buildSnapParticles() {
    const textEl = textRef.current;
    if (!textEl) return;
    const rect = textEl.getBoundingClientRect();

    const off = document.createElement('canvas');
    off.width  = Math.ceil(rect.width);
    off.height = Math.ceil(rect.height);
    const octx = off.getContext('2d');
    const cs = window.getComputedStyle(textEl);
    octx.fillStyle = '#f4f1e8';
    octx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    octx.textBaseline = 'middle';
    octx.textAlign = 'center';
    octx.fillText(textEl.textContent, off.width / 2, off.height / 2);

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const ps = [];
    const W = window.innerWidth;
    for (let y = 0; y < off.height; y += SAMPLE_STEP) {
      for (let x = 0; x < off.width; x += SAMPLE_STEP) {
        const idx = (y * off.width + x) * 4;
        if (data[idx + 3] > 128) {
          // Right-to-left wave: particles further right disintegrate first
          const distFromLeft = x / off.width;     // 0..1
          ps.push({
            x: rect.left + x,
            y: rect.top  + y,
            vx: 1.6 + Math.random() * 2.6,
            vy: (Math.random() - 0.5) * 0.7 - 0.18,
            size: 1.0 + Math.random() * 1.1,
            baseAlpha: 0.7 + Math.random() * 0.3,
            snapDelay: (1 - distFromLeft) * 0.35 + Math.random() * 0.4,    // 0..0.75
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
    }

    /* Rolls-Royce starlight style shooting stars:
       - Three profiles: quick (short tail, fast), medium, elegant (long tail, slow)
       - Random direction (full 360)
       - Drawn as thin gradient line (head bright → tail transparent)
       - Some travel a long way; some are tiny brief flickers
    */
    function spawnShootingStar() {
      const profile = Math.random();
      let tailLen, speed, life, lineWidth;
      if (profile < 0.45) {
        // quick brief flick
        tailLen   = 25 + Math.random() * 35;
        speed     = 7  + Math.random() * 5;
        life      = 28 + Math.random() * 18;
        lineWidth = 0.8;
      } else if (profile < 0.85) {
        // medium
        tailLen   = 70 + Math.random() * 80;
        speed     = 4  + Math.random() * 3;
        life      = 80 + Math.random() * 60;
        lineWidth = 1.0;
      } else {
        // long elegant
        tailLen   = 180 + Math.random() * 140;
        speed     = 2.0 + Math.random() * 1.6;
        life      = 220 + Math.random() * 140;
        lineWidth = 1.2;
      }

      // Random direction with slight downward bias (more natural)
      const angle = Math.random() * Math.PI * 2 + Math.PI * 0.05;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      // Spawn somewhere on screen (not just edges) so they appear anywhere
      const margin = -50;
      const startX = margin + Math.random() * (W - margin * 2);
      const startY = margin + Math.random() * (H * 0.7 - margin * 2);

      shootingStars.push({
        x: startX, y: startY, vx, vy,
        tailLen, life: 0, maxLife: life, lineWidth,
        // mild color variation
        hue: Math.random() < 0.7 ? 'rgba(255, 245, 225,' : 'rgba(220, 230, 255,',
      });
    }

    let lastShoot = performance.now() - 1000;   // spawn first one quickly
    let nextShootIn = 400 + Math.random() * 600;

    function frame(now) {
      ctx.clearRect(0, 0, W, H);

      // --- Spawn shooting stars frequently for ambient feel ---
      if (now - lastShoot > nextShootIn) {
        spawnShootingStar();
        // sometimes a quick cluster
        if (Math.random() < 0.3) setTimeout(spawnShootingStar, 200 + Math.random() * 400);
        lastShoot = now;
        nextShootIn = 600 + Math.random() * 1800;
      }

      // --- Render shooting stars as gradient lines ---
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const sh = shootingStars[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life++;
        const lr = sh.life / sh.maxLife;
        const fade = lr < 0.12
          ? lr / 0.12
          : lr > 0.7
            ? Math.max(0, 1 - (lr - 0.7) / 0.3)
            : 1;

        // Tail end: opposite of velocity direction
        const speed = Math.hypot(sh.vx, sh.vy) || 1;
        const ux = sh.vx / speed;
        const uy = sh.vy / speed;
        const tailX = sh.x - ux * sh.tailLen;
        const tailY = sh.y - uy * sh.tailLen;

        const grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
        grad.addColorStop(0,   sh.hue + '0)');
        grad.addColorStop(0.6, sh.hue + (0.18 * fade) + ')');
        grad.addColorStop(1,   sh.hue + (0.95 * fade) + ')');
        ctx.strokeStyle = grad;
        ctx.lineWidth   = sh.lineWidth;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(sh.x, sh.y);
        ctx.stroke();

        // Tiny soft head glow (subtle, not a missile)
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
        setTextPhase('in');
      } else if (phase === 'text-in' && elapsed >= T_TEXT_IN) {
        phaseRef.current = 'hold';
        phaseStartRef.current = now;
      } else if (phase === 'hold' && elapsed >= T_HOLD_TEXT) {
        // Begin Thanos snap — sample current DOM text
        buildSnapParticles();
        setTextPhase('snap');     // hides DOM text instantly
        setBlurStars(true);
        phaseRef.current = 'snap';
        phaseStartRef.current = now;
      } else if (phase === 'snap' && elapsed >= T_SNAP) {
        phaseRef.current = 'done';
        setDismissing(true);
        setTimeout(() => onComplete?.(), T_DISMISS_FADE);
      }

      // --- Render snap particles ---
      if (phase === 'snap' && particlesRef.current.length) {
        const t = elapsed / T_SNAP;
        const ps = particlesRef.current;
        for (const p of ps) {
          const local = Math.max(0, (t - p.snapDelay) / (1 - p.snapDelay));
          if (local <= 0) {
            ctx.fillStyle = `rgba(244, 241, 232, ${p.baseAlpha})`;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            continue;
          }
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.992;
          p.vy *= 0.992;
          const alpha = Math.max(0, 1 - local) * p.baseAlpha;
          ctx.fillStyle = `rgba(244, 241, 232, ${alpha})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    phaseStartRef.current = performance.now();
    animRef.current = requestAnimationFrame(frame);

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

      <div className="landing-text-wrap">
        <div
          ref={textRef}
          className={`landing-text ${textPhase}`}
          style={{ fontFamily: FONT_STACK, fontWeight: FONT_WEIGHT }}
        >
          {TEXT}
        </div>
      </div>

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

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import './LandingPage.css';

/**
 * Landing sequence:
 *  1. Stars + Rolls-Royce-style varied shooting stars
 *  2. "Welcome to Settlr" fades in (DOM, opacity 0→1, scale-out from center)
 *  3. Settle: canvas particles crossfade in over the DOM text (seamless handoff)
 *  4. Hold (canvas particles only)
 *  5. Spider-Man / Thanos snap: slow right-to-left disintegration wave,
 *     mixed grain sizes, particles drift right & fade
 *  6. After snap, dashboard
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
const FONT_STACK       = "'Montserrat', 'Helvetica Neue', system-ui, sans-serif";
const FONT_WEIGHT      = 300;
const SAMPLE_STEP      = 2;        // fine grain

// Phase timing (ms)
const T_STARS_ONLY      = 3200;
const T_TEXT_IN         = 1800;    // DOM fade + scale
const T_SETTLE          = 380;     // DOM↘ canvas↗ crossfade
const T_HOLD            = 1000;
const T_SNAP            = 3400;    // slow Spider-Man wave
const T_DISMISS_FADE    = 900;

export default function LandingPage({ onComplete }) {
  const overlayRef    = useRef(null);
  const textRef       = useRef(null);
  const animRef       = useRef(null);
  const particlesRef  = useRef([]);
  const phaseRef      = useRef('stars');     // stars → text-in → settle → hold → snap → done
  const phaseStartRef = useRef(performance.now());

  const [textPhase,  setTextPhase]  = useState('hidden');   // hidden → in → fading → gone
  const [blurStars,  setBlurStars]  = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // ---------- Build particles by sampling DOM text exactly ----------
  function buildParticles() {
    const textEl = textRef.current;
    if (!textEl) return;
    const rect = textEl.getBoundingClientRect();
    const cs = window.getComputedStyle(textEl);

    // Render text at exactly the same metrics as the DOM
    const off = document.createElement('canvas');
    off.width  = Math.ceil(rect.width);
    off.height = Math.ceil(rect.height);
    const octx = off.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    octx.textBaseline = 'middle';
    octx.textAlign = 'center';
    octx.fillText(TEXT, off.width / 2, off.height / 2);

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const ps = [];
    for (let y = 0; y < off.height; y += SAMPLE_STEP) {
      for (let x = 0; x < off.width; x += SAMPLE_STEP) {
        const idx = (y * off.width + x) * 4;
        if (data[idx + 3] > 80) {
          // Mixed grain sizes — most tiny, some chunkier
          const r = Math.random();
          const size = r < 0.6  ? 1
                     : r < 0.85 ? 1.5
                     : r < 0.97 ? 2.2
                     : 3.0;

          // Spider-Man wave: rightmost pixels disintegrate first
          // Wave covers ~70% of T_SNAP, each pixel fades over remaining 30%
          const distFromRight = 1 - (x / off.width);   // 0 at right edge → 1 at left
          const waveStart = distFromRight * 0.7;       // 0..0.7
          const jitter = (Math.random() - 0.3) * 0.18; // some particles go early/late
          const snapDelay = Math.max(0, Math.min(0.85, waveStart + jitter));

          // Heavier grains drift a bit faster (sand caught in wind)
          const speedBoost = size > 1.5 ? 0.4 + Math.random() * 0.4 : 0;
          ps.push({
            x: rect.left + x,
            y: rect.top  + y,
            vx: 1.0 + Math.random() * 2.4 + speedBoost,
            vy: (Math.random() - 0.5) * 0.7 - 0.12,
            size,
            alphaBase: 0.82 + Math.random() * 0.18,
            snapDelay,
            // Per-particle decay rate after release (varies the trail look)
            decay: 0.9 + Math.random() * 0.4,
          });
        }
      }
    }
    particlesRef.current = ps;
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
    }

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
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const margin = -50;
      shootingStars.push({
        x: margin + Math.random() * (W - margin * 2),
        y: margin + Math.random() * (H * 0.7 - margin * 2),
        vx, vy, tailLen, life: 0, maxLife: life, lineWidth,
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
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life++;
        const lr = sh.life / sh.maxLife;
        const fade = lr < 0.12 ? lr / 0.12
                  : lr > 0.7  ? Math.max(0, 1 - (lr - 0.7) / 0.3)
                  : 1;
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
        // Build particles right when DOM text is fully visible — same metrics
        buildParticles();
        // Start crossfading DOM out
        setTextPhase('fading');
        phaseRef.current = 'settle';
        phaseStartRef.current = now;
      } else if (phase === 'settle' && elapsed >= T_SETTLE) {
        setTextPhase('gone');
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

      // --- Render text-particle layer ---
      const ps = particlesRef.current;
      if (ps.length) {
        if (phase === 'settle') {
          // Particles fade in 0 → 1 to crossfade with DOM text fading out
          const t = elapsed / T_SETTLE;
          for (const p of ps) {
            ctx.fillStyle = `rgba(244, 241, 232, ${p.alphaBase * t})`;
            ctx.fillRect(p.x, p.y, p.size, p.size);
          }
        } else if (phase === 'hold') {
          for (const p of ps) {
            ctx.fillStyle = `rgba(244, 241, 232, ${p.alphaBase})`;
            ctx.fillRect(p.x, p.y, p.size, p.size);
          }
        } else if (phase === 'snap') {
          const t = elapsed / T_SNAP;
          for (const p of ps) {
            if (t <= p.snapDelay) {
              // Not yet released — still part of solid text
              ctx.fillStyle = `rgba(244, 241, 232, ${p.alphaBase})`;
              ctx.fillRect(p.x, p.y, p.size, p.size);
              continue;
            }
            // Released — drift right, decay
            const localT = t - p.snapDelay;     // 0..(1-snapDelay)
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.992;
            p.vy *= 0.992;
            const alpha = Math.max(0, 1 - localT * p.decay * 3.5) * p.alphaBase;
            if (alpha > 0.005) {
              ctx.fillStyle = `rgba(244, 241, 232, ${alpha})`;
              ctx.fillRect(p.x, p.y, p.size, p.size);
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

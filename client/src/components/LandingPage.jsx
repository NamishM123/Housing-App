import { useEffect, useRef, useState } from 'react';
import './LandingPage.css';

/**
 * Cinematic landing sequence:
 *  1. Realistic parallax starfield fades in
 *  2. Rolls-Royce-style slow shooting stars streak occasionally
 *  3. "WELCOME TO SETTLR" appears, expands ("mosh")
 *  4. Stars blur, text dissolves into drifting particles to the right
 *  5. onComplete fires → main app revealed
 */
export default function LandingPage({ onComplete }) {
  const canvasRef     = useRef(null);
  const containerRef  = useRef(null);
  const textRef       = useRef(null);
  const animRef       = useRef(null);
  const particlesRef  = useRef([]);          // text-dissolve particles
  const dissolvingRef = useRef(false);

  const [phase, setPhase] = useState('appear');   // appear → expand → dissolve → done
  const [blurStars, setBlurStars] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // ---------- Starfield + shooting stars (canvas) ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    const stars = [];
    const shootingStars = [];

    const STAR_COLORS = [
      'rgba(255,255,255,',   // pure white
      'rgba(220,230,255,',   // cool blue
      'rgba(255,240,220,',   // warm
      'rgba(200,210,255,',   // pale blue
      'rgba(255,225,200,',   // amber
    ];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function buildStars() {
      stars.length = 0;
      const density = Math.floor((W * H) / 2200);  // ~realistic density
      for (let i = 0; i < density; i++) {
        const layer = Math.random();              // 0..1 → parallax depth
        const size  = layer < 0.7
          ? 0.4 + Math.random() * 0.8             // most stars: tiny
          : 1.0 + Math.random() * 1.6;            // a few: bright
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: layer,
          r: size,
          baseAlpha: 0.35 + Math.random() * 0.55,
          twinkleSpeed: 0.4 + Math.random() * 1.6,
          twinklePhase: Math.random() * Math.PI * 2,
          color: STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0],
        });
      }
    }

    function spawnShootingStar() {
      // Rolls-Royce headliner style: slow, gentle, soft trail
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? -50 : W + 50;
      const startY = Math.random() * H * 0.6;
      const angle  = (fromLeft ? 1 : -1) * (0.18 + Math.random() * 0.12); // gentle slope
      const speed  = 1.2 + Math.random() * 1.4;
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 220 + Math.random() * 160,
        trail: [],
      });
    }

    let t0 = performance.now();
    let lastShoot = t0;
    let nextShootIn = 1500 + Math.random() * 2000;

    function frame(now) {
      const t = (now - t0) / 1000;

      // Background gradient wash (subtle nebula)
      ctx.clearRect(0, 0, W, H);
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, Math.max(W, H) * 0.7);
      grad.addColorStop(0,   'rgba(20, 25, 50, 0.55)');
      grad.addColorStop(0.5, 'rgba(8, 10, 25, 0.35)');
      grad.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const tw = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const alpha = s.baseAlpha * (0.55 + 0.45 * tw);
        // soft glow for bigger stars
        if (s.r > 1.3) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
          g.addColorStop(0, s.color + (alpha * 0.9) + ')');
          g.addColorStop(1, s.color + '0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = s.color + alpha + ')';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shooting stars
      if (now - lastShoot > nextShootIn) {
        spawnShootingStar();
        // sometimes spawn a quick pair (Rolls-Royce vibe occasionally has clusters)
        if (Math.random() < 0.25) setTimeout(spawnShootingStar, 250);
        lastShoot = now;
        nextShootIn = 1800 + Math.random() * 2800;
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const sh = shootingStars[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life++;
        sh.trail.push({ x: sh.x, y: sh.y });
        if (sh.trail.length > 28) sh.trail.shift();

        // fade in then out
        const lifeRatio = sh.life / sh.maxLife;
        const fade = lifeRatio < 0.15
          ? lifeRatio / 0.15
          : lifeRatio > 0.7
            ? Math.max(0, 1 - (lifeRatio - 0.7) / 0.3)
            : 1;

        // trail
        for (let j = 0; j < sh.trail.length; j++) {
          const p = sh.trail[j];
          const a = (j / sh.trail.length) * 0.8 * fade;
          ctx.fillStyle = `rgba(255, 240, 220, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.8 + (j / sh.trail.length) * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        // head
        const headG = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 8);
        headG.addColorStop(0, `rgba(255, 250, 235, ${0.95 * fade})`);
        headG.addColorStop(1, `rgba(255, 250, 235, 0)`);
        ctx.fillStyle = headG;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 8, 0, Math.PI * 2);
        ctx.fill();

        if (sh.life >= sh.maxLife || sh.x < -100 || sh.x > W + 100 || sh.y > H + 100) {
          shootingStars.splice(i, 1);
        }
      }

      // Text-dissolve particles
      if (dissolvingRef.current && particlesRef.current.length) {
        const ps = particlesRef.current;
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.995;
          p.vy *= 0.995;
          p.life += 1;
          const a = Math.max(0, 1 - p.life / p.maxLife);
          ctx.fillStyle = `rgba(244, 241, 232, ${a * p.baseAlpha})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          if (p.life >= p.maxLife) ps.splice(i, 1);
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // ---------- Phase orchestration ----------
  useEffect(() => {
    // Phase 1: appear (1.6s) → Phase 2: hold (0.6s) → expand (1.6s) → dissolve (1.8s) → done
    const t1 = setTimeout(() => setPhase('expand'), 2200);
    const t2 = setTimeout(() => {
      setBlurStars(true);
      triggerDissolve();
      setPhase('dissolve');
    }, 2200 + 1100);   // start dissolve mid-expand for overlap
    const t3 = setTimeout(() => {
      setDismissing(true);
    }, 2200 + 1100 + 1800);
    const t4 = setTimeout(() => {
      onComplete?.();
    }, 2200 + 1100 + 1800 + 900);

    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [onComplete]);

  // ---------- Build dissolve particles by sampling text pixels ----------
  function triggerDissolve() {
    const textEl = textRef.current;
    if (!textEl) return;
    const rect = textEl.getBoundingClientRect();

    // Render the text to an offscreen canvas, sample pixels → spawn particles
    const off = document.createElement('canvas');
    const scale = 1;
    off.width  = Math.ceil(rect.width  * scale);
    off.height = Math.ceil(rect.height * scale);
    const octx = off.getContext('2d');
    const cs = window.getComputedStyle(textEl);
    octx.fillStyle = '#f4f1e8';
    octx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    octx.textBaseline = 'middle';
    octx.textAlign = 'center';
    // letter-spacing isn't supported on canvas reliably, but it's close enough
    octx.fillText(textEl.textContent, off.width / 2, off.height / 2);

    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const step = 4;   // sampling resolution (smaller = more particles)
    const ps = particlesRef.current;
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const idx = (y * off.width + x) * 4;
        if (data[idx + 3] > 128) {
          ps.push({
            x: rect.left + x,
            y: rect.top  + y,
            vx: 1.2 + Math.random() * 2.4,           // drift right
            vy: (Math.random() - 0.5) * 0.6,
            size: 1 + Math.random() * 1.4,
            life: 0,
            maxLife: 110 + Math.random() * 70,
            baseAlpha: 0.6 + Math.random() * 0.4,
          });
        }
      }
    }
    dissolvingRef.current = true;
  }

  return (
    <div
      ref={containerRef}
      className={`landing-root ${dismissing ? 'dismissing' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className={`landing-canvas ${blurStars ? 'blur' : ''}`}
      />
      <div className="landing-text-wrap">
        <div
          ref={textRef}
          className={`landing-text ${
            phase === 'appear' ? 'appear' :
            phase === 'expand' ? 'expand' :
            phase === 'dissolve' ? 'dissolved' : ''
          }`}
        >
          Welcome to Settlr
        </div>
      </div>
    </div>
  );
}

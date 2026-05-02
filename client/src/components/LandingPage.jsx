import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import './LandingPage.css';

/**
 * Cinematic landing sequence:
 *  1. Realistic 3D parallax starfield (R3F + drei) fades in
 *  2. Slow Rolls-Royce-style shooting stars on overlay canvas
 *  3. "WELCOME TO SETTLR" appears, expands ("mosh")
 *  4. Stars blur, text dissolves into drifting particles
 *  5. onComplete fires → main app revealed
 */

function StarField() {
  const ref = useRef();
  // Slow drift gives a sense of motion without spinning the scene
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.01;
      ref.current.rotation.x += delta * 0.003;
    }
  });
  return (
    <group ref={ref}>
      <Stars
        radius={120}      // sphere radius
        depth={60}        // depth of star layer
        count={9000}      // dense, real-looking field
        factor={3.2}      // star size factor
        saturation={0.4}  // tint variation
        fade
        speed={0.6}       // twinkle speed
      />
    </group>
  );
}

export default function LandingPage({ onComplete }) {
  const overlayRef    = useRef(null);
  const textRef       = useRef(null);
  const animRef       = useRef(null);
  const particlesRef  = useRef([]);
  const dissolvingRef = useRef(false);

  const [phase, setPhase] = useState('appear');
  const [blurStars, setBlurStars] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // ---------- Overlay canvas: shooting stars + dissolve particles ----------
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
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? -50 : W + 50;
      const startY = Math.random() * H * 0.6;
      const angle  = (fromLeft ? 1 : -1) * (0.18 + Math.random() * 0.12);
      const speed  = 1.4 + Math.random() * 1.6;
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

    let lastShoot = performance.now();
    let nextShootIn = 1500 + Math.random() * 2000;

    function frame(now) {
      ctx.clearRect(0, 0, W, H);

      // Spawn shooting stars
      if (now - lastShoot > nextShootIn) {
        spawnShootingStar();
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
        if (sh.trail.length > 30) sh.trail.shift();

        const lifeRatio = sh.life / sh.maxLife;
        const fade = lifeRatio < 0.15
          ? lifeRatio / 0.15
          : lifeRatio > 0.7
            ? Math.max(0, 1 - (lifeRatio - 0.7) / 0.3)
            : 1;

        // Trail
        for (let j = 0; j < sh.trail.length; j++) {
          const p = sh.trail[j];
          const a = (j / sh.trail.length) * 0.85 * fade;
          ctx.fillStyle = `rgba(255, 240, 220, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.6 + (j / sh.trail.length) * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        // Head
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

      // Dissolve particles
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
    const t1 = setTimeout(() => setPhase('expand'), 2200);
    const t2 = setTimeout(() => {
      setBlurStars(true);
      triggerDissolve();
      setPhase('dissolve');
    }, 2200 + 1100);
    const t3 = setTimeout(() => setDismissing(true), 2200 + 1100 + 1800);
    const t4 = setTimeout(() => onComplete?.(), 2200 + 1100 + 1800 + 900);
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [onComplete]);

  function triggerDissolve() {
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
    const step = 4;
    const ps = particlesRef.current;
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const idx = (y * off.width + x) * 4;
        if (data[idx + 3] > 128) {
          ps.push({
            x: rect.left + x,
            y: rect.top  + y,
            vx: 1.2 + Math.random() * 2.4,
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
    <div className={`landing-root ${dismissing ? 'dismissing' : ''}`}>
      {/* Realistic 3D starfield */}
      <div className={`landing-three ${blurStars ? 'blur' : ''}`}>
        <Canvas
          camera={{ position: [0, 0, 1], fov: 75 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: 'radial-gradient(ellipse at center, #060814 0%, #02030a 60%, #000 100%)' }}
        >
          <StarField />
        </Canvas>
      </div>

      {/* Overlay canvas: shooting stars + dissolve particles */}
      <canvas ref={overlayRef} className="landing-overlay" />

      {/* Text */}
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

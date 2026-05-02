import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, useTexture } from '@react-three/drei';
import { BackSide } from 'three';
import './LandingPage.css';

/**
 * Landing sequence:
 *  1. Stars + Rolls-Royce shooting stars (~3.2s)
 *  2. "Welcome to Settlr" fades + scales in from center (1.8s)
 *  3. Text holds (1s), then fades out
 *  4. 3D Earth zooms in from space, rotating from Pacific → Americas (US on right)
 *  5. Nav fades in — logo top-left, links top-right
 *  6. "Try Settlr" / "Log In" → onComplete (dashboard)
 */

const EARTH_URL = 'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-blue-marble.jpg';
useTexture.preload(EARTH_URL);

const easeOutCubic  = t => 1 - Math.pow(1 - t, 3);
const easeOutQuart  = t => 1 - Math.pow(1 - t, 4);

// Earth rotation: start showing Pacific (back of US), end showing Americas
const ROT_START = Math.PI * 1.55;
const ROT_END   = Math.PI * 0.44;
const TILT      = 0.22;          // x-axis tilt, shows more of North America

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

const EARTH_DUR = 3.0;  // seconds for zoom + rotate

function EarthSphere({ active }) {
  const groupRef = useRef();
  const startRef = useRef(null);
  const texture  = useTexture(EARTH_URL);

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g || !active) return;

    if (!startRef.current) startRef.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - startRef.current) / EARTH_DUR);
    const e = easeOutQuart(t);

    // Scale: tiny dot → full globe
    g.scale.setScalar(0.04 + 0.96 * e);
    // Rotation: Pacific → Americas
    g.rotation.y = ROT_START + (ROT_END - ROT_START) * easeOutCubic(t);

    // Once settled, slow ambient drift
    if (t >= 1) {
      g.rotation.y += delta * 0.018;
    }
  });

  if (!active) return null;

  return (
    <>
      <ambientLight intensity={0.10} />
      <directionalLight position={[6, 2, 4]} intensity={1.5} color="#fff6ee" />
      {/* Rim light from behind — gives depth on the dark side */}
      <directionalLight position={[-5, -1, -4]} intensity={0.18} color="#4466cc" />

      <group
        ref={groupRef}
        position={[0.7, -0.2, 0]}
        rotation={[TILT, ROT_START, 0]}
        scale={[0.04, 0.04, 0.04]}
      >
        {/* Globe */}
        <mesh>
          <sphereGeometry args={[2.5, 72, 72]} />
          <meshLambertMaterial map={texture} />
        </mesh>
        {/* Atmospheric glow (inner halo) */}
        <mesh scale={[1.016, 1.016, 1.016]}>
          <sphereGeometry args={[2.5, 32, 32]} />
          <meshBasicMaterial color="#2255ee" transparent opacity={0.055} side={BackSide} />
        </mesh>
      </group>
    </>
  );
}

// Phase timing (ms)
const T_STARS     = 3200;
const T_TEXT_IN   = 1800;
const T_TEXT_HOLD = 1100;
const T_TEXT_OUT  = 700;
const T_EARTH     = 3200;   // after text-out starts, earth animates in

export default function LandingPage({ onComplete }) {
  const overlayRef  = useRef(null);
  const shootAnim   = useRef(null);

  const [earthActive, setEarthActive] = useState(false);
  const [textPhase,   setTextPhase]   = useState('hidden');   // hidden|in|hold|out|gone
  const [navIn,       setNavIn]       = useState(false);
  const [dismissing,  setDismissing]  = useState(false);

  function goToDashboard() {
    setDismissing(true);
    setTimeout(() => onComplete?.(), 650);
  }

  // ── Phase orchestration ──────────────────────────────────────────────────
  useEffect(() => {
    const schedule = [
      [T_STARS,                                   () => setTextPhase('in')],
      [T_STARS + T_TEXT_IN,                       () => setTextPhase('hold')],
      [T_STARS + T_TEXT_IN + T_TEXT_HOLD,         () => { setTextPhase('out'); setEarthActive(true); }],
      [T_STARS + T_TEXT_IN + T_TEXT_HOLD + T_TEXT_OUT,  () => setTextPhase('gone')],
      [T_STARS + T_TEXT_IN + T_TEXT_HOLD + T_EARTH, () => setNavIn(true)],
    ];
    const ids = schedule.map(([ms, fn]) => setTimeout(fn, ms));
    return () => ids.forEach(clearTimeout);
  }, []);

  // ── Shooting stars overlay canvas ────────────────────────────────────────
  useEffect(() => {
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const stars = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;  H = canvas.clientHeight;
      canvas.width = W * dpr;  canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      const p = Math.random();
      let tail, spd, life, lw;
      if      (p < 0.45) { tail = 25 + Math.random()*35;  spd = 7 + Math.random()*5;   life = 28 + Math.random()*18;  lw = 0.75; }
      else if (p < 0.85) { tail = 70 + Math.random()*80;  spd = 4 + Math.random()*3;   life = 80 + Math.random()*60;  lw = 1.0;  }
      else               { tail = 180+ Math.random()*140; spd = 2 + Math.random()*1.6; life = 220+ Math.random()*140; lw = 1.2;  }
      const angle = Math.random() * Math.PI * 2 + Math.PI * 0.05;
      stars.push({
        x: -50 + Math.random() * (W + 100),
        y: -50 + Math.random() * (H * 0.75 + 100),
        vx: Math.cos(angle) * spd,  vy: Math.sin(angle) * spd,
        tail, life: 0, maxLife: life, lw,
        hue: Math.random() < 0.7 ? 'rgba(255,245,225,' : 'rgba(220,230,255,',
      });
    }

    let lastSpawn = performance.now() - 1000;
    let nextIn = 400 + Math.random() * 600;

    function frame(now) {
      ctx.clearRect(0, 0, W, H);
      if (now - lastSpawn > nextIn) {
        spawn();
        if (Math.random() < 0.3) setTimeout(spawn, 200 + Math.random() * 400);
        lastSpawn = now; nextIn = 600 + Math.random() * 1800;
      }
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.x += s.vx; s.y += s.vy; s.life++;
        const lr = s.life / s.maxLife;
        const fade = lr < 0.12 ? lr / 0.12 : lr > 0.7 ? Math.max(0, 1-(lr-0.7)/0.3) : 1;
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const ux = s.vx/sp, uy = s.vy/sp;
        const tx = s.x - ux*s.tail, ty = s.y - uy*s.tail;
        const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0,   s.hue + '0)');
        g.addColorStop(0.6, s.hue + (0.18*fade) + ')');
        g.addColorStop(1,   s.hue + (0.95*fade) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = s.lw; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
        const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 3);
        hg.addColorStop(0, s.hue + (0.7*fade) + ')');
        hg.addColorStop(1, s.hue + '0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI*2); ctx.fill();
        if (s.life >= s.maxLife || s.x < -200 || s.x > W+200 || s.y > H+200 || s.y < -200)
          stars.splice(i, 1);
      }
      shootAnim.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    shootAnim.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(shootAnim.current); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className={`landing-root ${dismissing ? 'dismissing' : ''}`}>
      {/* 3D canvas — starfield + Earth */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 68 }}
        gl={{ antialias: true, alpha: false }}
        className="landing-three"
        style={{ background: 'radial-gradient(ellipse at center, #060814 0%, #02030a 60%, #000 100%)' }}
      >
        <StarField />
        <Suspense fallback={null}>
          <EarthSphere active={earthActive} />
        </Suspense>
      </Canvas>

      {/* Shooting stars canvas */}
      <canvas ref={overlayRef} className="landing-overlay" />

      {/* "Welcome to Settlr" text */}
      {textPhase !== 'gone' && (
        <div className="landing-text-wrap">
          <p className={`landing-text lp-${textPhase}`}>Welcome to Settlr</p>
        </div>
      )}

      {/* Nav */}
      <nav className={`landing-nav ${navIn ? 'lp-in' : ''}`} aria-label="Settlr navigation">
        <div className="landing-nav-brand">
          <img src="/settlr-mark.svg" alt="Settlr" className="landing-nav-mark" />
          <span className="landing-nav-wordmark">SETTLR</span>
        </div>
        <div className="landing-nav-links">
          <button className="landing-nav-ghost" onClick={() => {}}>About Us</button>
          <button className="landing-nav-ghost" onClick={goToDashboard}>Log In</button>
          <button className="landing-nav-cta"   onClick={goToDashboard}>Try Settlr</button>
        </div>
      </nav>

      {/* Skip — only visible before nav appears */}
      {!navIn && (
        <button className="landing-skip-btn" onClick={goToDashboard} type="button">
          Skip →
        </button>
      )}
    </div>
  );
}

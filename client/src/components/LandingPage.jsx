import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, useTexture } from '@react-three/drei';
import { BackSide } from 'three';
import './LandingPage.css';

const EARTH_URL = 'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-blue-marble.jpg';
useTexture.preload(EARTH_URL);

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

// Earth position in world units (matches globe clip computation below)
const EARTH_X     =  0.7;
const EARTH_Y     = -0.2;
// Rotation: 0 = 0°E (Africa), positive CCW from above = brings East into view
// back of US (show Eurasia) ≈ 80°E  → 80*π/180 ≈ 1.40
// front of US (continental center ~100°W = 260°E) → 260*π/180 ≈ 4.54
const ROT_START   = 1.40;   // showing Eurasia — US is on far side
const ROT_END     = 4.54;   // showing continental US
const TILT        = -0.28;  // negative = north pole tilts toward camera (shows North America)
const EARTH_DUR   = 3.2;    // seconds to animate in

// Phase timing (ms)
const T_STARS     = 1800;   // stars-only intro (shorter so text comes sooner)
const T_TEXT_IN   = 1800;
const T_TEXT_HOLD = 1000;
const T_TEXT_OUT  = 700;
const T_EARTH     = 3400;   // starts when text-out begins; nav appears after this

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

function EarthSphere({ active, scaleRef }) {
  const groupRef = useRef();
  const startRef = useRef(null);
  const texture  = useTexture(EARTH_URL);

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g) return;

    if (!active) return;

    // Initialise on first active frame
    if (!startRef.current) {
      startRef.current = clock.elapsedTime;
      g.rotation.set(TILT, ROT_START, 0);
      g.scale.setScalar(0.03);
    }

    const t     = Math.min(1, (clock.elapsedTime - startRef.current) / EARTH_DUR);
    const scale = 0.03 + 0.97 * easeOutQuart(t);
    g.scale.setScalar(scale);
    g.rotation.y = ROT_START + (ROT_END - ROT_START) * easeOutCubic(t);

    // Slow ambient drift once settled
    if (t >= 1) g.rotation.y += delta * 0.018;

    // Share current scale so the canvas can mask out the globe area
    if (scaleRef) scaleRef.current = { active: true, scale };
  });

  if (!active) return null;

  return (
    <>
      {/* Bump ambient so the dark side of the earth isn't pitch black */}
      <ambientLight intensity={0.38} />
      {/* Main sun — front-right, slightly above */}
      <directionalLight position={[4, 2, 6]} intensity={1.6} color="#fff8f0" />
      {/* Soft blue rim from behind for depth */}
      <directionalLight position={[-4, -1, -5]} intensity={0.18} color="#3355bb" />

      <group ref={groupRef} position={[EARTH_X, EARTH_Y, 0]}>
        <mesh>
          <sphereGeometry args={[2.5, 72, 72]} />
          <meshLambertMaterial map={texture} />
        </mesh>
        {/* Atmospheric halo */}
        <mesh scale={[1.018, 1.018, 1.018]}>
          <sphereGeometry args={[2.5, 32, 32]} />
          <meshBasicMaterial color="#2244dd" transparent opacity={0.055} side={BackSide} />
        </mesh>
      </group>
    </>
  );
}

export default function LandingPage({ onComplete }) {
  const overlayRef   = useRef(null);
  const shootAnim    = useRef(null);
  const globeScaleRef = useRef({ active: false, scale: 0 });

  const [earthActive, setEarthActive] = useState(false);
  const [textPhase,   setTextPhase]   = useState('hidden');
  const [navIn,       setNavIn]       = useState(false);
  const [dismissing,  setDismissing]  = useState(false);

  function goToDashboard() {
    setDismissing(true);
    setTimeout(() => onComplete?.(), 650);
  }

  // ── Phase orchestration ──────────────────────────────────────────────────
  useEffect(() => {
    const t0 = T_STARS;
    const t1 = t0 + T_TEXT_IN;
    const t2 = t1 + T_TEXT_HOLD;
    const t3 = t2 + T_TEXT_OUT;
    const t4 = t2 + T_EARTH;   // nav appears after earth animation
    const schedule = [
      [t0, () => setTextPhase('in')],
      [t1, () => setTextPhase('hold')],
      [t2, () => { setTextPhase('out'); setEarthActive(true); }],
      [t3, () => setTextPhase('gone')],
      [t4, () => setNavIn(true)],
    ];
    const ids = schedule.map(([ms, fn]) => setTimeout(fn, ms));
    return () => ids.forEach(clearTimeout);
  }, []);

  // ── Shooting stars canvas ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = overlayRef.current;
    const ctx    = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const stars = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
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
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        tail, life: 0, maxLife: life, lw,
        hue: Math.random() < 0.7 ? 'rgba(255,245,225,' : 'rgba(220,230,255,',
      });
    }

    let lastSpawn = performance.now() - 1000;
    let nextIn = 400 + Math.random() * 600;

    // Precompute globe screen projection constants
    // fov=68 vertical, camera z=5 → pixels per world unit = H / (2 * 5 * tan(34°))
    const TAN_HALF_FOV = Math.tan((68 * Math.PI / 180) / 2); // ≈ 0.7002

    function frame(now) {
      ctx.clearRect(0, 0, W, H);

      // Spawn shooting stars
      if (now - lastSpawn > nextIn) {
        spawn();
        if (Math.random() < 0.3) setTimeout(spawn, 200 + Math.random() * 400);
        lastSpawn = now;
        nextIn = 600 + Math.random() * 1800;
      }

      // Clip so stars render BEHIND the globe (exclude the globe circle)
      const gs = globeScaleRef.current;
      const clipping = gs.active && gs.scale > 0.04;
      if (clipping) {
        const ppu  = H / (2 * 5 * TAN_HALF_FOV);          // pixels per world unit
        const gx   = W / 2 + EARTH_X * ppu;
        const gy   = H / 2 - EARTH_Y * ppu;                // screen y flipped
        const gr   = 2.62 * ppu * gs.scale;                // 2.62 = sphere radius + atmo
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);                              // outer rectangle (CW)
        ctx.arc(gx, gy, gr, 0, Math.PI * 2, true);         // globe circle (CCW = subtract)
        ctx.clip('evenodd');                                // everything OUTSIDE the globe
      }

      // Draw shooting stars
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.x += s.vx; s.y += s.vy; s.life++;
        const lr   = s.life / s.maxLife;
        const fade = lr < 0.12 ? lr / 0.12 : lr > 0.7 ? Math.max(0, 1 - (lr - 0.7) / 0.3) : 1;
        const sp   = Math.hypot(s.vx, s.vy) || 1;
        const ux = s.vx / sp, uy = s.vy / sp;
        const tx = s.x - ux * s.tail, ty = s.y - uy * s.tail;
        const g  = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0,   s.hue + '0)');
        g.addColorStop(0.6, s.hue + (0.18 * fade) + ')');
        g.addColorStop(1,   s.hue + (0.95 * fade) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = s.lw; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
        const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 3);
        hg.addColorStop(0, s.hue + (0.7 * fade) + ')');
        hg.addColorStop(1, s.hue + '0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill();
        if (s.life >= s.maxLife || s.x < -200 || s.x > W + 200 || Math.abs(s.y) > H + 200)
          stars.splice(i, 1);
      }

      if (clipping) ctx.restore();

      shootAnim.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    shootAnim.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(shootAnim.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={`landing-root ${dismissing ? 'dismissing' : ''}`}>
      {/* 3-D canvas — starfield always on; Earth after text phase */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 68 }}
        gl={{ antialias: true, alpha: false }}
        className="landing-three"
        style={{ background: 'radial-gradient(ellipse at center, #060814 0%, #02030a 60%, #000 100%)' }}
      >
        <StarField />
        <Suspense fallback={null}>
          <EarthSphere active={earthActive} scaleRef={globeScaleRef} />
        </Suspense>
      </Canvas>

      {/* Shooting stars — clipped behind the globe */}
      <canvas ref={overlayRef} className="landing-overlay" />

      {/* "Welcome to Settlr" */}
      {textPhase !== 'gone' && (
        <div className="landing-text-wrap">
          <p className={`landing-text lp-${textPhase}`}>Welcome to Settlr</p>
        </div>
      )}

      {/* Nav */}
      <nav className={`landing-nav ${navIn ? 'lp-in' : ''}`}>
        <div className="landing-nav-brand">
          <img src="/settlr-mark.svg" alt="Settlr" className="landing-nav-mark" />
        </div>
        <div className="landing-nav-links">
          <button className="landing-nav-ghost" onClick={() => {}}>About Us</button>
          <button className="landing-nav-ghost" onClick={goToDashboard}>Log In</button>
          <button className="landing-nav-cta"   onClick={goToDashboard}>Try Settlr</button>
        </div>
      </nav>

      {!navIn && (
        <button className="landing-skip-btn" onClick={goToDashboard} type="button">
          Skip →
        </button>
      )}
    </div>
  );
}

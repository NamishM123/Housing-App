import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, useTexture } from '@react-three/drei';
import { BackSide } from 'three';
import './LandingPage.css';

/**
 * Landing:
 *  1. Stars + shooting stars
 *  2. "Welcome to Settlr" fades + expands from center
 *  3. Text fades out completely — THEN Earth spawns
 *  4. Earth zooms in from nothing, sweeping Indonesia (120°E) → US (100°W)
 *  5. Nav fades in
 */

// High-quality textures from Three.js examples repo (CORS-safe raw GitHub)
const DAY_URL  = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg';
const SPEC_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg';
useTexture.preload([DAY_URL, SPEC_URL]);

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

// Rotation: increasing rotation.y brings East into view from the right
// Indonesia ≈ 120°E  → rotation.y = 120 * π/180 = 2.09
// US center ≈ 100°W = 260°E → rotation.y = 260 * π/180 = 4.54
// Sweep: +2.45 rad eastward (~140°), Pacific opens up, US arrives from right
const ROT_START = 2.09;  // Indonesia facing camera
const ROT_END   = 4.54;  // Continental US facing camera
const TILT      = -0.22; // North pole slightly toward camera (shows North America)
const EARTH_DUR = 3.0;   // seconds to animate

// Phase timing (ms)
const T_STARS     = 1800;
const T_TEXT_IN   = 1800;
const T_TEXT_HOLD = 1000;
const T_TEXT_OUT  = 650;
const T_EARTH_NAV = 3600; // after earth appears, wait this long before nav

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
  const groupRef  = useRef();
  const startRef  = useRef(null);
  const [dayMap, specMap] = useTexture([DAY_URL, SPEC_URL]);

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g || !active) return;

    if (!startRef.current) {
      startRef.current = clock.elapsedTime;
      g.rotation.set(TILT, ROT_START, 0);
      g.scale.setScalar(0.01);
    }

    const t     = Math.min(1, (clock.elapsedTime - startRef.current) / EARTH_DUR);
    const scale = 0.01 + 0.99 * easeOutQuart(t);
    g.scale.setScalar(scale);
    g.rotation.y = ROT_START + (ROT_END - ROT_START) * easeOutCubic(t);

    if (t >= 1) g.rotation.y += delta * 0.016; // slow ambient drift

    if (scaleRef) scaleRef.current = { active: true, scale };
  });

  if (!active) return null;

  return (
    <>
      <ambientLight intensity={0.45} />
      {/* Sun — from right-front to light the Americas */}
      <directionalLight position={[5, 2, 5]} intensity={1.8} color="#fff8f0" />
      {/* Soft blue bounce from opposite side — depth on dark hemisphere */}
      <directionalLight position={[-4, -1, -4]} intensity={0.22} color="#3355aa" />

      {/* Earth centered at origin */}
      <group ref={groupRef} position={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[2.5, 80, 80]} />
          {/* Phong gives ocean specular reflections — way more realistic than Lambert */}
          <meshPhongMaterial
            map={dayMap}
            specularMap={specMap}
            specular="#666666"
            shininess={12}
          />
        </mesh>
        {/* Atmospheric halo */}
        <mesh scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[2.5, 32, 32]} />
          <meshBasicMaterial color="#3366ff" transparent opacity={0.06} side={BackSide} />
        </mesh>
      </group>
    </>
  );
}

export default function LandingPage({ onComplete }) {
  const overlayRef    = useRef(null);
  const shootAnim     = useRef(null);
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
    const t3 = t2 + T_TEXT_OUT;   // text fully gone → spawn Earth
    const t4 = t3 + T_EARTH_NAV;  // Earth settled → nav in

    const ids = [
      setTimeout(() => setTextPhase('in'),                t0),
      setTimeout(() => setTextPhase('hold'),              t1),
      setTimeout(() => setTextPhase('out'),               t2),
      setTimeout(() => { setTextPhase('gone'); setEarthActive(true); }, t3),
      setTimeout(() => setNavIn(true),                    t4),
    ];
    return () => ids.forEach(clearTimeout);
  }, []);

  // ── Shooting stars (clipped behind globe) ───────────────────────────────
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
      if      (p < 0.45) { tail = 25+Math.random()*35;  spd = 7+Math.random()*5;   life = 28+Math.random()*18;  lw=0.75; }
      else if (p < 0.85) { tail = 70+Math.random()*80;  spd = 4+Math.random()*3;   life = 80+Math.random()*60;  lw=1.0;  }
      else               { tail =180+Math.random()*140; spd = 2+Math.random()*1.6; life=220+Math.random()*140; lw=1.2;  }
      const angle = Math.random() * Math.PI * 2 + Math.PI * 0.05;
      stars.push({
        x:-50+Math.random()*(W+100), y:-50+Math.random()*(H*0.75+100),
        vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
        tail, life:0, maxLife:life, lw,
        hue: Math.random()<0.7 ? 'rgba(255,245,225,' : 'rgba(220,230,255,',
      });
    }

    let lastSpawn = performance.now() - 1000;
    let nextIn    = 400 + Math.random() * 600;

    // fov=68 vertical, camera z=5
    const TAN_HALF = Math.tan((68 * Math.PI / 180) / 2);

    function frame(now) {
      ctx.clearRect(0, 0, W, H);

      if (now - lastSpawn > nextIn) {
        spawn();
        if (Math.random() < 0.3) setTimeout(spawn, 200+Math.random()*400);
        lastSpawn = now; nextIn = 600+Math.random()*1800;
      }

      // Clip so stars only draw OUTSIDE the globe circle
      const gs = globeScaleRef.current;
      const clipping = gs.active && gs.scale > 0.05;
      if (clipping) {
        const ppu = H / (2 * 5 * TAN_HALF); // pixels per world unit
        // Globe is centered at world [0,0] → screen center
        const gx = W / 2;
        const gy = H / 2;
        const gr = 2.58 * ppu * gs.scale;   // sphere radius 2.5 + tiny atmo margin
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);              // full canvas (CW)
        ctx.arc(gx, gy, gr, 0, Math.PI*2, true); // globe hole (CCW = subtract)
        ctx.clip('evenodd');
      }

      for (let i = stars.length-1; i >= 0; i--) {
        const s = stars[i];
        s.x+=s.vx; s.y+=s.vy; s.life++;
        const lr   = s.life/s.maxLife;
        const fade = lr<0.12 ? lr/0.12 : lr>0.7 ? Math.max(0,1-(lr-0.7)/0.3) : 1;
        const sp   = Math.hypot(s.vx,s.vy)||1;
        const ux=s.vx/sp, uy=s.vy/sp;
        const tx=s.x-ux*s.tail, ty=s.y-uy*s.tail;
        const g=ctx.createLinearGradient(tx,ty,s.x,s.y);
        g.addColorStop(0, s.hue+'0)');
        g.addColorStop(0.6, s.hue+(0.18*fade)+')');
        g.addColorStop(1, s.hue+(0.95*fade)+')');
        ctx.strokeStyle=g; ctx.lineWidth=s.lw; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(s.x,s.y); ctx.stroke();
        const hg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,3);
        hg.addColorStop(0, s.hue+(0.7*fade)+')');
        hg.addColorStop(1, s.hue+'0)');
        ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(s.x,s.y,3,0,Math.PI*2); ctx.fill();
        if (s.life>=s.maxLife||s.x<-200||s.x>W+200||Math.abs(s.y)>H+200) stars.splice(i,1);
      }

      if (clipping) ctx.restore();
      shootAnim.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    shootAnim.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(shootAnim.current); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className={`landing-root ${dismissing ? 'dismissing' : ''}`}>
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

      <canvas ref={overlayRef} className="landing-overlay" />

      {textPhase !== 'gone' && (
        <div className="landing-text-wrap">
          <p className={`landing-text lp-${textPhase}`}>Welcome to Settlr</p>
        </div>
      )}

      <nav className={`landing-nav ${navIn ? 'lp-in' : ''}`}>
        <div className="landing-nav-brand">
          <img src="/settlr-mark.svg" alt="Settlr" className="landing-nav-mark" />
        </div>
        <div className="landing-nav-links">
          <button className="landing-nav-ghost">About Us</button>
          <button className="landing-nav-ghost" onClick={goToDashboard}>Log In</button>
          <button className="landing-nav-cta"   onClick={goToDashboard}>Try Settlr</button>
        </div>
      </nav>

      {!navIn && (
        <button className="landing-skip-btn" onClick={goToDashboard}>Skip →</button>
      )}
    </div>
  );
}

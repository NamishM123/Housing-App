import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './LandingPage.css';

/**
 * Landing sequence:
 *  1. 3-D starfield + shooting stars
 *  2. "Welcome to Settlr" fades + expands from center
 *  3. Text fades out completely — THEN Mapbox globe fades in
 *  4. Globe sweeps eastward: Indonesia (120°E) → continental US (-95°W)
 *  5. Nav fades in
 */

const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

// Phase timing (ms)
const T_STARS     = 1800;
const T_TEXT_IN   = 1800;
const T_TEXT_HOLD = 1000;
const T_TEXT_OUT  = 650;
const T_EARTH_NAV = 3600;

// Mapbox globe animation
const GLOBE_ZOOM     = 1.5;
const GLOBE_START    = [120, 5];  // Indonesia
const GLOBE_END_LNG  = 265;       // 265°E = -95°W (going east through Pacific)
const GLOBE_END_LAT  = 40;
const GLOBE_DURATION = 3200;      // ms

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

function MapboxGlobe({ active, globeScreenRef }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const rafRef       = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

    const map = new mapboxgl.Map({
      container:          containerRef.current,
      style:              'mapbox://styles/mapbox/satellite-v9',
      projection:         'globe',
      center:             GLOBE_START,
      zoom:               GLOBE_ZOOM,
      interactive:        false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('style.load', () => {
      map.setFog({
        color:            'rgb(0, 0, 5)',
        'high-color':     'rgb(0, 3, 15)',
        'horizon-blend':  0.08,
        'space-color':    'rgb(0, 0, 0)',
        'star-intensity': 0,
      });
    });

    function updateGlobeScreen() {
      if (!mapRef.current || !globeScreenRef) return;
      try {
        const center    = mapRef.current.project(mapRef.current.getCenter());
        const northPole = mapRef.current.project([mapRef.current.getCenter().lng, 85]);
        const radius    = Math.abs(center.y - northPole.y) * 1.08;
        globeScreenRef.current = { active: true, x: center.x, y: center.y, radius };
      } catch (_) {}
    }

    let startTime = null;

    function animate(now) {
      if (!startTime) startTime = now;
      const t    = Math.min(1, (now - startTime) / GLOBE_DURATION);
      const ease = easeOutQuart(t);

      // Sweep eastward: 120°E → 265°E (which normalizes to -95°W when > 180)
      const lng           = GLOBE_START[0] + (GLOBE_END_LNG - GLOBE_START[0]) * ease;
      const lat           = GLOBE_START[1] + (GLOBE_END_LAT  - GLOBE_START[1]) * ease;
      const normalizedLng = lng > 180 ? lng - 360 : lng;

      map.setCenter([normalizedLng, lat]);
      updateGlobeScreen();

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Keep clip in sync while globe idles
        function keepSync() {
          updateGlobeScreen();
          rafRef.current = requestAnimationFrame(keepSync);
        }
        keepSync();
      }
    }

    map.once('load', () => {
      rafRef.current = requestAnimationFrame(animate);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={`landing-mapbox ${active ? 'active' : ''}`}
    />
  );
}

export default function LandingPage({ onComplete }) {
  const overlayRef     = useRef(null);
  const shootAnim      = useRef(null);
  const globeScreenRef = useRef({ active: false, x: 0, y: 0, radius: 0 });

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
    const t4 = t3 + T_EARTH_NAV;

    const ids = [
      setTimeout(() => setTextPhase('in'),                               t0),
      setTimeout(() => setTextPhase('hold'),                             t1),
      setTimeout(() => setTextPhase('out'),                              t2),
      setTimeout(() => { setTextPhase('gone'); setEarthActive(true); }, t3),
      setTimeout(() => setNavIn(true),                                   t4),
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

    function frame(now) {
      ctx.clearRect(0, 0, W, H);

      if (now - lastSpawn > nextIn) {
        spawn();
        if (Math.random() < 0.3) setTimeout(spawn, 200+Math.random()*400);
        lastSpawn = now; nextIn = 600+Math.random()*1800;
      }

      // Clip shooting stars to appear only OUTSIDE the globe
      const gs       = globeScreenRef.current;
      const clipping = gs.active && gs.radius > 10;
      if (clipping) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.arc(gs.x, gs.y, gs.radius, 0, Math.PI*2, true); // CCW = punch hole
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
      {/* Three.js starfield — background layer */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 68 }}
        gl={{ antialias: true, alpha: false }}
        className="landing-three"
        style={{ background: 'radial-gradient(ellipse at center, #060814 0%, #02030a 60%, #000 100%)' }}
      >
        <StarField />
      </Canvas>

      {/* Mapbox globe — fades in over stars when Earth phase begins */}
      <MapboxGlobe active={earthActive} globeScreenRef={globeScreenRef} />

      {/* Shooting-star overlay */}
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

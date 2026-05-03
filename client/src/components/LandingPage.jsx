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
const T_EARTH_NAV = 1200;   // nav fades in 1.2s after globe appears (was 3.6s)

// Mapbox globe animation
const GLOBE_ZOOM     = 1.8;
const GLOBE_LAT      = 25;        // constant lat — no tilt during sweep
const GLOBE_START    = [120, GLOBE_LAT];  // Indonesia
const GLOBE_END_LNG  = 265;       // 265°E = -95°W (going east through Pacific)
const GLOBE_DURATION = 3200;      // ms — initial sweep
const GLOBE_SPIN_DPS = 6;         // continuous spin after sweep, deg/sec

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
      <Stars radius={100} depth={50} count={2200} factor={9}   saturation={0.25} fade speed={0.4} />
      <Stars radius={140} depth={70} count={11000} factor={4.5} saturation={0.4}  fade speed={0.6} />
    </group>
  );
}

function MapboxGlobe({ active }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const rafRef       = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

    const map = new mapboxgl.Map({
      container:          containerRef.current,
      style:              'mapbox://styles/mapbox/satellite-streets-v12',
      projection:         'globe',
      center:             GLOBE_START,
      zoom:               GLOBE_ZOOM,
      interactive:        false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('style.load', () => {
      // Same atmosphere as dashboard globe
      map.setFog({
        color:            'rgba(120, 165, 220, 0.32)',
        'high-color':     'rgba(60, 110, 190, 0.22)',
        'horizon-blend':  0.04,
        'space-color':    'rgb(2, 6, 18)',
        'star-intensity': 0,
      });

      // High-detail terrain so mountains/relief are visible on the globe
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      }

      // Hide labels AND admin/border line layers (no country names or outlines)
      map.getStyle().layers.forEach(layer => {
        const id = layer.id.toLowerCase();
        if (
          layer.type === 'symbol' ||
          (layer.type === 'line' && (
            id.includes('admin') ||
            id.includes('border') ||
            id.includes('boundary') ||
            id.includes('state') ||
            id.includes('country')
          ))
        ) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      });
    });

    let startTime = null;
    let lastTime  = null;
    let lng       = GLOBE_START[0];

    function animate(now) {
      if (!startTime) startTime = now;
      if (!lastTime)  lastTime  = now;
      const dt    = (now - lastTime) / 1000;
      lastTime    = now;

      const t    = Math.min(1, (now - startTime) / GLOBE_DURATION);
      const ease = easeOutQuart(t);

      if (t < 1) {
        // initial sweep — eased eastward, constant lat (no tilt)
        lng = GLOBE_START[0] + (GLOBE_END_LNG - GLOBE_START[0]) * ease;
      } else {
        // continuous smooth eastward spin
        lng += GLOBE_SPIN_DPS * dt;
      }
      const normalizedLng = ((lng + 180) % 360 + 360) % 360 - 180;

      map.setCenter([normalizedLng, GLOBE_LAT]);

      rafRef.current = requestAnimationFrame(animate);
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
  const textRef        = useRef(null);
  const textRectRef    = useRef(null);

  const [earthActive, setEarthActive] = useState(false);
  const [textPhase,   setTextPhase]   = useState('hidden');
  const [navIn,       setNavIn]       = useState(false);
  const [dismissing,  setDismissing]  = useState(false);

  // Track globe screen position so shooting stars can be clipped around it
  useEffect(() => {
    if (!earthActive) {
      globeScreenRef.current = { active: false, x: 0, y: 0, radius: 0 };
      return;
    }
    const update = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      globeScreenRef.current = {
        active: true,
        x: W / 2,
        y: H / 2,
        radius: Math.min(W, H) * 0.44,
      };
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [earthActive]);

  // Track text bounding rect (changes during scale animation) so shooting
  // stars don't streak through the words
  useEffect(() => {
    if (textPhase === 'gone' || textPhase === 'hidden') {
      textRectRef.current = null;
      return;
    }
    const update = () => {
      if (textRef.current) {
        const r = textRef.current.getBoundingClientRect();
        textRectRef.current = {
          x: r.left,
          y: r.top,
          w: r.width,
          h: r.height,
        };
      }
    };
    update();
    const id = setInterval(update, 60);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', update);
    };
  }, [textPhase]);

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
      // Speeds significantly reduced so no star feels "super fast"
      if      (p < 0.45) { tail = 40+Math.random()*50;  spd = 2.2+Math.random()*1.2; life = 55+Math.random()*30;  lw=0.75; }
      else if (p < 0.85) { tail = 70+Math.random()*80;  spd = 1.6+Math.random()*1.0; life = 90+Math.random()*70;  lw=1.0;  }
      else               { tail =180+Math.random()*140; spd = 0.9+Math.random()*0.7; life=240+Math.random()*160; lw=1.2;  }
      // Left or right only — within ±15° of horizontal
      const spread = (Math.PI / 12); // 15°
      const base   = Math.random() < 0.5 ? 0 : Math.PI; // rightward or leftward
      const angle  = base + (Math.random() * 2 - 1) * spread;
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

      // Clip shooting stars so they never streak across the globe or text.
      // Build a single evenodd clip path: outer rect = include, nested holes
      // (globe disc, text bbox) = exclude.
      const gs        = globeScreenRef.current;
      const tr        = textRectRef.current;
      const clipGlobe = gs.active && gs.radius > 10;
      const clipText  = !!tr && tr.w > 1 && tr.h > 1;
      const clipping  = clipGlobe || clipText;
      if (clipping) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        if (clipGlobe) {
          // Sub-path for the globe disc — evenodd makes it a hole.
          ctx.moveTo(gs.x + gs.radius, gs.y);
          ctx.arc(gs.x, gs.y, gs.radius, 0, Math.PI * 2);
        }
        if (clipText) {
          // Padded text bbox so stars don't graze the letters either.
          const pad = 28;
          ctx.rect(tr.x - pad, tr.y - pad, tr.w + 2 * pad, tr.h + 2 * pad);
        }
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
      {/* Three.js starfield — transparent canvas; root div supplies the dark bg */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 68 }}
        gl={{ antialias: true, alpha: true }}
        className="landing-three"
        onCreated={({ gl }) => gl.setClearColor(0, 0, 0, 0)}
      >
        <StarField />
      </Canvas>

      {/* Mapbox globe — same as dashboard, no labels, fills screen */}
      <MapboxGlobe active={earthActive} />

      {/* Shooting-star overlay */}
      <canvas ref={overlayRef} className="landing-overlay" />

      {textPhase !== 'gone' && (
        <div className="landing-text-wrap">
          <div ref={textRef} className={`landing-text lp-${textPhase}`}>
            <span className="landing-text-line">Welcome to</span>
            <img
              src="/settlr-landing-wordmark.svg"
              alt="Settlr"
              className="landing-wordmark-img"
              draggable={false}
            />
          </div>
        </div>
      )}

      <nav className={`landing-nav ${navIn ? 'lp-in' : ''}`}>
        <div className="landing-nav-brand">
          <img src="/settlr-mark.svg" alt="Settlr" className="landing-nav-mark" />
        </div>
      </nav>

      <div className={`landing-cta-wrap ${navIn ? 'lp-in' : ''}`}>
        <button className="landing-hero-cta" onClick={goToDashboard}>
          <span className="landing-hero-cta-glow" aria-hidden="true" />
          <span className="landing-hero-cta-content">
            <span className="landing-hero-cta-label">Try Settlr</span>
            <svg
              className="landing-hero-cta-arrow"
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </span>
        </button>
      </div>

    </div>
  );
}

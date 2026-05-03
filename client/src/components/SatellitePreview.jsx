import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

const HEADINGS = [
  { id: 'n', label: 'N', bearing: 0 },
  { id: 'e', label: 'E', bearing: 90 },
  { id: 's', label: 'S', bearing: 180 },
  { id: 'w', label: 'W', bearing: 270 },
];

// Newer Mapbox v3 "Standard Satellite" style — sharper imagery, realistic 3D
// landmarks/lighting. Falls back to satellite-streets-v12 if it errors.
const STYLE_PRIMARY = 'mapbox://styles/mapbox/standard-satellite';
const STYLE_FALLBACK = 'mapbox://styles/mapbox/satellite-streets-v12';

const GOOGLE_EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || '';

export default function SatellitePreview({ listing, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const rotateFrameRef = useRef(null);
  const fellBackRef = useRef(false);
  const initMapRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [bearing, setBearing] = useState(-20);
  const [autoRotate, setAutoRotate] = useState(true);
  const [firstPerson, setFirstPerson] = useState(false);
  const [view, setView] = useState('street'); // only 'street' now

  const initMap = useCallback((styleUrl) => {
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [listing.lng, listing.lat],
      zoom: 18.2,
      pitch: 70,
      bearing: -20,
      maxPitch: 85,
      maxZoom: 22,
      antialias: true,
      attributionControl: false,
      interactive: true,
      dragRotate: true,
      pitchWithRotate: true,
      // Render at native device pixel ratio for crisp imagery on retina displays
      // (capped to avoid GPU stalls on phones with DPR > 2)
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    // Touch / pinch / two-finger rotate is on by default; make sure keyboard nav is on.
    map.keyboard.enable();
    map.scrollZoom.setWheelZoomRate(1 / 200);
    map.scrollZoom.setZoomRate(1 / 50);

    // Fall back to legacy satellite if v3 style fails to load (e.g. token without v3 access)
    const onError = (e) => {
      const msg = String(e?.error?.message || e?.message || '');
      if (!fellBackRef.current && /style|standard/i.test(msg)) {
        fellBackRef.current = true;
        initMapRef.current?.(STYLE_FALLBACK);
      }
    };
    map.on('error', onError);

    map.on('style.load', () => {
      // Standard style supports config props for lighting/landmarks; older styles ignore these
      try {
        map.setConfigProperty('basemap', 'lightPreset', 'day');
        map.setConfigProperty('basemap', 'show3dObjects', true);
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
      } catch { /* style doesn't support config — fine */ }

      // Add terrain (skip if already provided by Standard style)
      if (!map.getSource('preview-dem')) {
        map.addSource('preview-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: 'preview-dem', exaggeration: 1.2 });
      }

      // Sky (only on legacy styles — Standard provides its own atmosphere)
      const isStandard = (map.getStyle()?.name || '').toLowerCase().includes('standard');
      if (!isStandard && !map.getLayer('preview-sky')) {
        map.addLayer({
          id: 'preview-sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 80.0],
            'sky-atmosphere-sun-intensity': 12,
          },
        });
      }

      // Add 3D buildings only on legacy style (Standard already renders them in 3D)
      if (!isStandard && !map.getLayer('preview-3d-buildings')) {
        const layers = map.getStyle().layers;
        const labelLayer = layers.find(l => l.type === 'symbol' && l.layout?.['text-field']);
        try {
          map.addLayer(
            {
              id: 'preview-3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 14,
              paint: {
                'fill-extrusion-color': '#a8b3c7',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.78,
              },
            },
            labelLayer?.id,
          );
        } catch { /* missing source-layer on this style — ignore */ }
      }

      // Pulsing marker
      if (markerRef.current) markerRef.current.remove();
      const el = document.createElement('div');
      el.className = 'preview-pin';
      el.innerHTML = '<div class="preview-pin-inner"></div>';
      markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([listing.lng, listing.lat])
        .addTo(map);

      setLoaded(true);
    });

    map.on('rotate', () => setBearing(map.getBearing()));
  }, [listing]);

  // Keep a ref to initMap so the error-handler closure can recurse without
  // referencing the binding before it's declared
  useEffect(() => { initMapRef.current = initMap; }, [initMap]);

  // Init mini satellite map
  useEffect(() => {
    if (!listing?.lat || !listing?.lng) return;
    if (!mapboxgl.accessToken) return;
    fellBackRef.current = false;
    initMap(STYLE_PRIMARY);

    return () => {
      if (rotateFrameRef.current) cancelAnimationFrame(rotateFrameRef.current);
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [listing, initMap]);

  // Slow drone-style auto-rotate (only when aerial tab is visible)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    if (view !== 'aerial') {
      if (rotateFrameRef.current) { cancelAnimationFrame(rotateFrameRef.current); rotateFrameRef.current = null; }
      return;
    }
    if (!autoRotate) {
      if (rotateFrameRef.current) { cancelAnimationFrame(rotateFrameRef.current); rotateFrameRef.current = null; }
      return;
    }
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (mapRef.current && !mapRef.current.isMoving()) {
        const next = (mapRef.current.getBearing() + dt * 5) % 360; // 5°/sec
        mapRef.current.setBearing(next);
      }
      rotateFrameRef.current = requestAnimationFrame(tick);
    };
    rotateFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (rotateFrameRef.current) { cancelAnimationFrame(rotateFrameRef.current); rotateFrameRef.current = null; }
    };
  }, [loaded, autoRotate, view]);

  // Keyboard controls — Street-View-style WASD/arrow nav (aerial tab only)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (view !== 'aerial') return;
      // Don't fight typing in inputs
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      let handled = true;
      const panStep = 60;     // px
      const zoomStep = 0.5;
      const rotateStep = 12;  // deg
      const pitchStep = 6;    // deg

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': map.panBy([0, -panStep]); break;
        case 'ArrowDown': case 's': case 'S': map.panBy([0, panStep]); break;
        case 'ArrowLeft': case 'a': case 'A': map.panBy([-panStep, 0]); break;
        case 'ArrowRight': case 'd': case 'D': map.panBy([panStep, 0]); break;
        case '+': case '=': map.zoomTo(map.getZoom() + zoomStep, { duration: 200 }); break;
        case '-': case '_': map.zoomTo(map.getZoom() - zoomStep, { duration: 200 }); break;
        case 'q': case 'Q': map.easeTo({ bearing: map.getBearing() - rotateStep, duration: 200 }); setAutoRotate(false); break;
        case 'e': case 'E': map.easeTo({ bearing: map.getBearing() + rotateStep, duration: 200 }); setAutoRotate(false); break;
        case 'r': case 'R': map.easeTo({ pitch: Math.min(85, map.getPitch() + pitchStep), duration: 200 }); break;
        case 'f': case 'F': map.easeTo({ pitch: Math.max(0, map.getPitch() - pitchStep), duration: 200 }); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded, onClose, view]);

  const flyToHeading = (b) => {
    setAutoRotate(false);
    if (mapRef.current) mapRef.current.easeTo({ bearing: b, duration: 700 });
  };

  const toggleFirstPerson = () => {
    if (!mapRef.current) return;
    const goingIn = !firstPerson;
    setFirstPerson(goingIn);
    setAutoRotate(false);
    mapRef.current.easeTo(
      goingIn
        ? { zoom: 19.6, pitch: 84, duration: 900 }
        : { zoom: 18.2, pitch: 70, duration: 900 },
    );
  };

  const streetViewUrl = listing?.lat && listing?.lng
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${listing.lat},${listing.lng}`
    : null;

  const streetEmbedUrl = listing?.lat && listing?.lng && GOOGLE_EMBED_KEY
    ? `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_EMBED_KEY}&location=${listing.lat},${listing.lng}&heading=210&pitch=0&fov=90`
    : null;

  if (!listing) return null;
  const hasToken = !!mapboxgl.accessToken;
  const hasCoords = !!(listing.lat && listing.lng);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal preview-modal">
        <div className="modal-header">
          <div>
            <h3>🚶 Street View</h3>
            <p className="modal-subtitle">{listing.address}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="preview-map-wrap">
          {/* Street view (Google Maps Embed API iframe) */}
          <div className="preview-view-pane">
            {!hasCoords ? (
              <div className="preview-fallback">No coordinates available for this listing.</div>
            ) : !GOOGLE_EMBED_KEY ? (
              <div className="preview-fallback streetview-setup">
                <div style={{ textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🚶</div>
                  <strong style={{ fontSize: 16 }}>Street View Available</strong>
                  <p className="muted small" style={{ marginTop: 12, lineHeight: 1.5 }}>
                    Click below to view this location in Google Street View
                  </p>
                </div>
                {streetViewUrl && (
                  <a
                    className="preview-streetview-btn static"
                    href={streetViewUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginTop: 24, padding: '12px 24px', fontSize: 14, fontWeight: 700 }}
                  >
                    🚶 Open Google Street View →
                  </a>
                )}
                <p className="muted small" style={{ marginTop: 24, fontSize: 11, color: '#64748b' }}>
                  To embed Street View here, add <code>VITE_GOOGLE_MAPS_EMBED_KEY</code> to your .env file
                </p>
              </div>
            ) : (
              <iframe
                title="Google Street View"
                className="preview-streetview-iframe"
                src={streetEmbedUrl}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        </div>

        <div className="preview-meta">
          <span><strong>${listing.price?.toLocaleString()}/mo</strong></span>
          <span className="stat-sep">·</span>
          <span>{listing.beds} bd · {listing.baths} ba</span>
          {listing.sqft && (<><span className="stat-sep">·</span><span>{listing.sqft.toLocaleString()} sqft</span></>)}
        </div>

        {view === 'aerial' ? (
          <div className="preview-hint-row">
            <span className="kbd-hint"><kbd>WASD</kbd>/<kbd>↑↓←→</kbd> pan</span>
            <span className="kbd-hint"><kbd>Q</kbd>/<kbd>E</kbd> rotate</span>
            <span className="kbd-hint"><kbd>R</kbd>/<kbd>F</kbd> tilt</span>
            <span className="kbd-hint"><kbd>+</kbd>/<kbd>-</kbd> zoom</span>
            <span className="kbd-hint kbd-muted">drag · scroll · right-drag to tilt</span>
          </div>
        ) : (
          <div className="preview-hint-row">
            <span className="kbd-hint kbd-muted">Drag to look around · click arrows on the road to walk down the street</span>
          </div>
        )}
      </div>
    </div>
  );
}

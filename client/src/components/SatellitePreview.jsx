import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const HEADINGS = [
  { id: 'n', label: 'N',  bearing: 0   },
  { id: 'e', label: 'E',  bearing: 90  },
  { id: 's', label: 'S',  bearing: 180 },
  { id: 'w', label: 'W',  bearing: 270 },
];

export default function SatellitePreview({ listing, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const rotateFrameRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [bearing, setBearing] = useState(-20);
  const [autoRotate, setAutoRotate] = useState(true);

  // Init mini satellite map
  useEffect(() => {
    if (!listing?.lat || !listing?.lng) return;
    if (!mapboxgl.accessToken) return;
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [listing.lng, listing.lat],
      zoom: 17.2,
      pitch: 62,
      bearing: -20,
      antialias: true,
      attributionControl: false,
      interactive: true,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');

    mapRef.current.on('load', () => {
      mapRef.current.addSource('preview-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      mapRef.current.setTerrain({ source: 'preview-dem', exaggeration: 1.3 });

      mapRef.current.addLayer({
        id: 'preview-sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 80.0],
          'sky-atmosphere-sun-intensity': 12,
        },
      });

      // 3D buildings for context around the listing
      const layers = mapRef.current.getStyle().layers;
      const labelLayer = layers.find(l => l.type === 'symbol' && l.layout?.['text-field']);
      mapRef.current.addLayer(
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
            'fill-extrusion-opacity': 0.75,
          },
        },
        labelLayer?.id,
      );

      // Drop a pin at the listing
      const el = document.createElement('div');
      el.className = 'preview-pin';
      el.innerHTML = '<div class="preview-pin-inner"></div>';
      markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([listing.lng, listing.lat])
        .addTo(mapRef.current);

      setLoaded(true);
    });

    return () => {
      if (rotateFrameRef.current) cancelAnimationFrame(rotateFrameRef.current);
      if (markerRef.current) markerRef.current.remove();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [listing]);

  // Slow auto-rotate for a "drone fly-around" feel
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    if (!autoRotate) {
      if (rotateFrameRef.current) { cancelAnimationFrame(rotateFrameRef.current); rotateFrameRef.current = null; }
      return;
    }
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (mapRef.current && !mapRef.current.isMoving()) {
        const next = (mapRef.current.getBearing() + dt * 6) % 360; // 6°/sec
        mapRef.current.setBearing(next);
        setBearing(next);
      }
      rotateFrameRef.current = requestAnimationFrame(tick);
    };
    rotateFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (rotateFrameRef.current) { cancelAnimationFrame(rotateFrameRef.current); rotateFrameRef.current = null; }
    };
  }, [loaded, autoRotate]);

  // ESC to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const flyToHeading = (b) => {
    setAutoRotate(false);
    if (mapRef.current) {
      mapRef.current.easeTo({ bearing: b, duration: 700 });
      setBearing(b);
    }
  };

  if (!listing) return null;
  const hasToken = !!mapboxgl.accessToken;
  const hasCoords = !!(listing.lat && listing.lng);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal preview-modal">
        <div className="modal-header">
          <div>
            <h3>🛰️ Satellite Preview</h3>
            <p className="modal-subtitle">{listing.address}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="preview-map-wrap">
          {!hasToken || !hasCoords ? (
            <div className="preview-fallback">
              {!hasToken
                ? <span>Add <code>VITE_MAPBOX_TOKEN</code> to enable the satellite preview.</span>
                : <span>No coordinates available for this listing.</span>}
            </div>
          ) : (
            <>
              <div ref={containerRef} className="preview-map" />
              {!loaded && (
                <div className="preview-loading">
                  <div className="spinner sm" />
                  <span>Loading aerial view…</span>
                </div>
              )}
              <div className="preview-controls">
                <button
                  className={`preview-rotate-btn ${autoRotate ? 'active' : ''}`}
                  onClick={() => setAutoRotate(r => !r)}
                  title="Auto-rotate"
                >
                  {autoRotate ? '⏸ Pause rotate' : '↻ Auto-rotate'}
                </button>
                <div className="preview-headings">
                  {HEADINGS.map(h => {
                    const diff = Math.abs(((bearing - h.bearing + 540) % 360) - 180);
                    const active = diff < 22.5;
                    return (
                      <button
                        key={h.id}
                        className={`heading-btn ${active ? 'active' : ''}`}
                        onClick={() => flyToHeading(h.bearing)}
                      >
                        {h.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="preview-meta">
          <span><strong>${listing.price?.toLocaleString()}/mo</strong></span>
          <span className="stat-sep">·</span>
          <span>{listing.beds} bd · {listing.baths} ba</span>
          {listing.sqft && (<><span className="stat-sep">·</span><span>{listing.sqft.toLocaleString()} sqft</span></>)}
        </div>

        <p className="muted small">
          Drag to look around · scroll to zoom · use the heading buttons to face N/E/S/W.
        </p>
      </div>
    </div>
  );
}

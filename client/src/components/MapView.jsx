import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { NEIGHBORHOODS, getAffordabilityColor, getAffordabilityLabel, matchesVibe } from '../data/neighborhoods';

function buildMarkerEl(listing, isShortlisted) {
  const el = document.createElement('div');
  el.className = 'listing-pin' + (isShortlisted ? ' shortlisted' : '');
  el.innerHTML = `<span>$${Math.round(listing.price / 100) * 100 < listing.price ? Math.ceil(listing.price / 100) * 100 : listing.price}`;
  el.title = listing.address;
  // Format as $2.1k style for compact display
  const k = listing.price >= 1000 ? `$${(listing.price / 1000).toFixed(1)}k` : `$${listing.price}`;
  el.innerHTML = `<span>${k}</span>`;
  return el;
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Height in metres for 3D extrusion: affordable = tall
function extrusionHeight(rent, monthlyIncome, maxRent) {
  if (!monthlyIncome) return 300;
  if (maxRent && rent > maxRent) return 80;
  const pct = rent / monthlyIncome;
  if (pct < 0.28) return 1800;
  if (pct < 0.35) return 1200;
  if (pct < 0.45) return 600;
  return 180;
}

const LEGEND = [
  { color: '#22c55e', label: 'Comfortable  <28%' },
  { color: '#14b8a6', label: 'Manageable  28–35%' },
  { color: '#f59e0b', label: 'Tight  35–45%' },
  { color: '#ef4444', label: 'Out of range / Over budget' },
];

export default function MapView({ monthlyIncome, roommates, maxRent, vibe, onNeighborhoodSelect, selectedId, listings, shortlist, onListingSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (map.current) return;
    if (!mapboxgl.accessToken) { setMapError(true); return; }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-120.68, 35.30],
        zoom: 9.2,
        pitch: 48,
        bearing: -12,
        antialias: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.on('load', () => setMapLoaded(true));
      map.current.on('error', () => setMapError(true));
    } catch { setMapError(true); }

    return () => { if (map.current) { map.current.remove(); map.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    NEIGHBORHOODS.forEach((hood) => {
      const sourceId  = `hood-${hood.id}`;
      const extrudeId = `extrude-${hood.id}`;
      const outlineId = `outline-${hood.id}`;
      const labelId   = `label-${hood.id}`;

      const effectiveRent = roommates > 0 ? Math.round(hood.avgRent / (roommates + 1)) : hood.avgRent;
      const vibeMatch = matchesVibe(hood, vibe);
      const isSelected = hood.id === selectedId;
      const color   = monthlyIncome > 0 ? getAffordabilityColor(effectiveRent, monthlyIncome, maxRent) : '#475569';
      const height  = extrusionHeight(effectiveRent, monthlyIncome, maxRent);
      const opacity = vibeMatch ? (isSelected ? 0.92 : 0.72) : 0.18;

      const geojson = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [hood.polygon] },
        properties: { id: hood.id, name: hood.name, rent: effectiveRent },
      };

      if (map.current.getSource(sourceId)) {
        map.current.getSource(sourceId).setData(geojson);
      } else {
        map.current.addSource(sourceId, { type: 'geojson', data: geojson });
      }

      // ── 3D extrusion ─────────────────────────────────
      if (map.current.getLayer(extrudeId)) {
        map.current.setPaintProperty(extrudeId, 'fill-extrusion-color', color);
        map.current.setPaintProperty(extrudeId, 'fill-extrusion-height', height);
        map.current.setPaintProperty(extrudeId, 'fill-extrusion-opacity', opacity);
      } else {
        map.current.addLayer({
          id: extrudeId,
          type: 'fill-extrusion',
          source: sourceId,
          paint: {
            'fill-extrusion-color': color,
            'fill-extrusion-height': height,
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': opacity,
          },
        });

        map.current.on('click', extrudeId, () => {
          onNeighborhoodSelect({ ...hood, avgRent: effectiveRent });
          map.current.flyTo({ center: hood.center, zoom: 11.5, pitch: 55, bearing: -8, duration: 900 });
        });

        map.current.on('mouseenter', extrudeId, () => {
          map.current.getCanvas().style.cursor = 'pointer';
          const r = roommates > 0 ? Math.round(hood.avgRent / (roommates + 1)) : hood.avgRent;
          const label = monthlyIncome > 0 ? getAffordabilityLabel(r, monthlyIncome, maxRent) : 'Enter salary';
          const c     = monthlyIncome > 0 ? getAffordabilityColor(r, monthlyIncome, maxRent) : '#6b7280';
          const overBudget = maxRent && r > maxRent
            ? `<div style="font-size:11px;color:#f59e0b;margin-top:3px">⚠️ Over your $${maxRent.toLocaleString()} cap</div>`
            : '';
          const dimNote = !vibeMatch
            ? `<div style="font-size:11px;color:#64748b;margin-top:2px">Outside vibe filter</div>`
            : '';

          popupRef.current = new mapboxgl.Popup({ closeButton: false, offset: [0, -8] })
            .setLngLat(hood.center)
            .setHTML(`
              <div style="font-family:system-ui;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:10px;color:#f1f5f9;min-width:180px">
                <div style="font-weight:700;font-size:14px;margin-bottom:6px">${hood.name}</div>
                <div style="display:flex;gap:16px;font-size:12px;color:#94a3b8">
                  <span>Rent <strong style="color:#f1f5f9">$${r.toLocaleString()}/mo</strong></span>
                  <span>Walk <strong style="color:#f1f5f9">${hood.walkScore}</strong></span>
                </div>
                ${monthlyIncome > 0 ? `<div style="margin-top:8px;display:inline-block;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${c}22;color:${c};border:1px solid ${c}55">${label}</div>` : ''}
                ${overBudget}${dimNote}
              </div>
            `)
            .addTo(map.current);
        });

        map.current.on('mouseleave', extrudeId, () => {
          map.current.getCanvas().style.cursor = '';
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        });
      }

      // ── Outline ───────────────────────────────────────
      if (map.current.getLayer(outlineId)) {
        map.current.setPaintProperty(outlineId, 'line-color', color);
        map.current.setPaintProperty(outlineId, 'line-width', isSelected ? 3 : 1);
        map.current.setPaintProperty(outlineId, 'line-opacity', vibeMatch ? (isSelected ? 1 : 0.6) : 0.15);
      } else {
        map.current.addLayer({
          id: outlineId, type: 'line', source: sourceId,
          paint: { 'line-color': color, 'line-width': isSelected ? 3 : 1, 'line-opacity': vibeMatch ? 0.6 : 0.15 },
        });
      }

      // ── Label ─────────────────────────────────────────
      const labelSource = `label-src-${hood.id}`;
      const labelGeojson = { type: 'Feature', geometry: { type: 'Point', coordinates: hood.center }, properties: { name: hood.name } };

      if (map.current.getSource(labelSource)) {
        map.current.getSource(labelSource).setData(labelGeojson);
      } else {
        map.current.addSource(labelSource, { type: 'geojson', data: labelGeojson });
      }

      if (map.current.getLayer(labelId)) {
        map.current.setPaintProperty(labelId, 'text-opacity', vibeMatch ? 1 : 0.25);
        map.current.setPaintProperty(labelId, 'text-color', isSelected ? '#ffffff' : '#cbd5e1');
      } else {
        map.current.addLayer({
          id: labelId, type: 'symbol', source: labelSource,
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': isSelected ? '#ffffff' : '#cbd5e1',
            'text-halo-color': '#0f172a',
            'text-halo-width': 1.5,
            'text-opacity': vibeMatch ? 1 : 0.25,
          },
        });
      }
    });
  }, [mapLoaded, monthlyIncome, roommates, maxRent, vibe, selectedId, onNeighborhoodSelect]);

  // ── Listing price pins ────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!listings?.length) return;

    listings.forEach(listing => {
      if (!listing.lat || !listing.lng) return;
      const isShortlisted = (shortlist || []).some(s => s.id === listing.id);
      const el = buildMarkerEl(listing, isShortlisted);

      const popup = new mapboxgl.Popup({ offset: [0, -28], closeButton: false })
        .setHTML(`
          <div style="font-family:system-ui;padding:8px 12px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#f1f5f9;min-width:200px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${listing.address}</div>
            <div style="display:flex;gap:12px;font-size:12px;color:#94a3b8;margin-bottom:8px">
              <span><strong style="color:#f1f5f9">$${listing.price?.toLocaleString()}/mo</strong></span>
              <span>${listing.beds}bd · ${listing.baths}ba${listing.sqft ? ` · ${listing.sqft.toLocaleString()} sqft` : ''}</span>
            </div>
            <div style="font-size:11px;color:#64748b">${listing.type} · Available ${listing.available}</div>
            ${listing.petFriendly ? '<div style="font-size:11px;color:#22c55e;margin-top:3px">🐾 Pet-friendly</div>' : ''}
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([listing.lng, listing.lat])
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onListingSelect) onListingSelect(listing);
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, listings, shortlist, onListingSelect]);

  // Reset camera when deselecting
  useEffect(() => {
    if (!mapLoaded || !map.current || selectedId) return;
    map.current.flyTo({ center: [-120.68, 35.30], zoom: 9.2, pitch: 48, bearing: -12, duration: 700 });
  }, [mapLoaded, selectedId]);

  if (mapError || !mapboxgl.accessToken) {
    return (
      <div className="map-fallback">
        <div className="map-fallback-inner">
          <h3>Neighborhoods</h3>
          <p className="muted">Add <code>VITE_MAPBOX_TOKEN</code> in <code>client/.env</code> to enable the 3D map.</p>
          <div className="neighborhood-grid">
            {NEIGHBORHOODS.map(hood => {
              const r     = roommates > 0 ? Math.round(hood.avgRent / (roommates + 1)) : hood.avgRent;
              const color = monthlyIncome > 0 ? getAffordabilityColor(r, monthlyIncome, maxRent) : '#6b7280';
              const label = monthlyIncome > 0 ? getAffordabilityLabel(r, monthlyIncome, maxRent) : '—';
              const vm    = matchesVibe(hood, vibe);
              return (
                <button key={hood.id}
                  className={`neighborhood-card ${hood.id === selectedId ? 'selected' : ''}`}
                  style={{ borderColor: color, opacity: vm ? 1 : 0.35 }}
                  onClick={() => onNeighborhoodSelect({ ...hood, avgRent: r })}
                >
                  <div className="neighborhood-card-name">{hood.name}</div>
                  <div className="neighborhood-card-rent">${r.toLocaleString()}/mo</div>
                  <div className="neighborhood-card-label" style={{ color }}>{label}</div>
                  {maxRent && r > maxRent && <div className="neighborhood-card-warn">Over budget</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />

      <div className="map-legend">
        <div className="legend-title">Affordability</div>
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="legend-hint">Taller = more affordable</div>
        {vibe && vibe !== 'any' && <div className="legend-filter">Vibe: <strong>{vibe}</strong></div>}
      </div>

      {!mapLoaded && (
        <div className="map-loading">
          <div className="spinner" />
          <span>Loading 3D map…</span>
        </div>
      )}
    </div>
  );
}

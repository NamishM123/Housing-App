import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { NEIGHBORHOODS, getAffordabilityColor, getAffordabilityLabel, matchesVibe } from '../data/neighborhoods';

function buildMarkerEl(listing, isShortlisted) {
  const el = document.createElement('div');
  el.className = 'listing-pin' + (isShortlisted ? ' shortlisted' : '');
  el.title = listing.address;
  const k = listing.price >= 1000 ? `$${(listing.price / 1000).toFixed(1)}k` : `$${listing.price}`;
  el.innerHTML = `<span>${k}</span>`;
  return el;
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

function extrusionHeight(rent, monthlyIncome, maxRent) {
  if (!monthlyIncome) return 500;
  if (maxRent && rent > maxRent) return 120;
  const pct = rent / monthlyIncome;
  if (pct < 0.28) return 2800;
  if (pct < 0.35) return 1800;
  if (pct < 0.45) return 900;
  return 250;
}

const LEGEND = [
  { color: '#22c55e', label: 'Comfortable  <28%' },
  { color: '#14b8a6', label: 'Manageable  28–35%' },
  { color: '#f59e0b', label: 'Tight  35–45%' },
  { color: '#ef4444', label: 'Out of range / Over budget' },
];

const ROUTE_AMENITIES = [
  { id: 'grocery',  label: 'Grocery',  icon: '🛒', name: "Trader Joe's SLO",      lng: -120.6681, lat: 35.2792 },
  { id: 'hospital', label: 'Hospital', icon: '🏥', name: 'Sierra Vista Regional', lng: -120.6700, lat: 35.2683 },
  { id: 'gym',      label: 'Gym',      icon: '💪', name: 'Planet Fitness SLO',    lng: -120.6640, lat: 35.2831 },
  { id: 'beach',    label: 'Beach',    icon: '🏖️', name: 'Avila Beach',           lng: -120.7295, lat: 35.1793 },
  { id: 'trails',   label: 'Trails',   icon: '🥾', name: 'Bishop Peak Trailhead', lng: -120.6982, lat: 35.3009 },
  { id: 'downtown', label: 'Downtown', icon: '🏙️', name: 'Downtown SLO',          lng: -120.6606, lat: 35.2800 },
  { id: 'calpoly',  label: 'Cal Poly', icon: '🎓', name: 'Cal Poly SLO',          lng: -120.6596, lat: 35.3050 },
  { id: 'airport',  label: 'Airport',  icon: '✈️', name: 'SLO Airport',           lng: -120.6417, lat: 35.2368 },
];

function fmtDist(metres) {
  const miles = metres * 0.000621371;
  return miles < 0.1 ? `${Math.round(metres)} m` : `${miles.toFixed(1)} mi`;
}
function fmtDur(seconds) {
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function MapView({ monthlyIncome, roommates, maxRent, vibe, onNeighborhoodSelect, selectedId, listings, shortlist, onListingSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // ── Routing state ───────────────────────────────────
  const [routeOpen, setRouteOpen] = useState(false);
  const [activeAmenity, setActiveAmenity] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [userLngLat, setUserLngLat] = useState(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  // Attempt geolocation once on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLngLat([pos.coords.longitude, pos.coords.latitude]),
      () => {},
      { timeout: 6000, maximumAge: 60000 }
    );
  }, []);

  // ── Map init ─────────────────────────────────────────
  useEffect(() => {
    if (map.current) return;
    if (!mapboxgl.accessToken) { setMapError(true); return; }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-120.68, 35.28],
        zoom: 9.8,
        pitch: 58,
        bearing: -18,
        antialias: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        map.current.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
        map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 2.0 });

        map.current.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 80.0],
            'sky-atmosphere-sun-intensity': 12,
            'sky-atmosphere-color': 'rgba(135, 206, 235, 1.0)',
            'sky-atmosphere-halo-color': 'rgba(255, 255, 255, 0.5)',
          },
        });

        setMapLoaded(true);
      });

      map.current.on('error', () => setMapError(true));
    } catch { setMapError(true); }

    return () => { if (map.current) { map.current.remove(); map.current = null; } };
  }, []);

  // ── Neighborhood extrusions ───────────────────────────
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
      const color   = monthlyIncome > 0 ? getAffordabilityColor(effectiveRent, monthlyIncome, maxRent) : '#64748b';
      const height  = extrusionHeight(effectiveRent, monthlyIncome, maxRent);
      const opacity = vibeMatch ? (isSelected ? 0.82 : 0.65) : 0.15;

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

      if (map.current.getLayer(outlineId)) {
        map.current.setPaintProperty(outlineId, 'line-color', color);
        map.current.setPaintProperty(outlineId, 'line-width', isSelected ? 4 : 2);
        map.current.setPaintProperty(outlineId, 'line-opacity', vibeMatch ? (isSelected ? 1 : 0.85) : 0.15);
      } else {
        map.current.addLayer({
          id: outlineId, type: 'line', source: sourceId,
          paint: { 'line-color': color, 'line-width': isSelected ? 4 : 2, 'line-opacity': vibeMatch ? 0.85 : 0.15 },
        });
      }

      const labelSource = `label-src-${hood.id}`;
      const labelGeojson = { type: 'Feature', geometry: { type: 'Point', coordinates: hood.center }, properties: { name: hood.name } };

      if (map.current.getSource(labelSource)) {
        map.current.getSource(labelSource).setData(labelGeojson);
      } else {
        map.current.addSource(labelSource, { type: 'geojson', data: labelGeojson });
      }

      if (map.current.getLayer(labelId)) {
        map.current.setPaintProperty(labelId, 'text-opacity', vibeMatch ? 1 : 0.2);
      } else {
        map.current.addLayer({
          id: labelId, type: 'symbol', source: labelSource,
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 13,
            'text-anchor': 'center',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0,0,0,0.85)',
            'text-halo-width': 2,
            'text-opacity': vibeMatch ? 1 : 0.2,
          },
        });
      }
    });
  }, [mapLoaded, monthlyIncome, roommates, maxRent, vibe, selectedId, onNeighborhoodSelect]);

  // ── Listing price pins ────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
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

  // ── User location pulsing dot ─────────────────────────
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (!userLngLat) return;

    const el = document.createElement('div');
    el.className = 'user-location-dot';

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(userLngLat)
      .addTo(map.current);
  }, [mapLoaded, userLngLat]);

  // ── Route rendering with animation ───────────────────
  const clearRoute = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (!map.current) return;
    ['route-glow', 'route-casing', 'route-line'].forEach(id => {
      if (map.current.getLayer(id)) map.current.removeLayer(id);
    });
    if (map.current.getSource('route')) map.current.removeSource('route');
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
  }, []);

  const drawRoute = useCallback((coords, amenity) => {
    if (!map.current) return;
    clearRoute();

    // Destination marker
    const destEl = document.createElement('div');
    destEl.className = 'dest-marker';
    destEl.innerHTML = amenity.icon;
    destMarkerRef.current = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
      .setLngLat([amenity.lng, amenity.lat])
      .addTo(map.current);

    // Route source — start empty, fill via animation
    map.current.addSource('route', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }] },
    });

    map.current.addLayer({
      id: 'route-glow', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#38bdf8', 'line-width': 16, 'line-opacity': 0.20, 'line-blur': 6 },
    });
    map.current.addLayer({
      id: 'route-casing', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#0284c7', 'line-width': 6, 'line-opacity': 0.90 },
    });
    map.current.addLayer({
      id: 'route-line', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#e0f2fe', 'line-width': 2.5, 'line-opacity': 1 },
    });

    // Fly to fit route bounds
    const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
    map.current.fitBounds(bounds, { padding: 80, pitch: 55, bearing: -10, duration: 1100 });

    // Animate drawing
    const total = coords.length;
    const stepsPerFrame = Math.max(1, Math.ceil(total / 80));
    let step = 0;

    function tick() {
      step = Math.min(step + stepsPerFrame, total);
      if (map.current?.getSource('route')) {
        map.current.getSource('route').setData({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.slice(0, step) } }],
        });
      }
      if (step < total) animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, [clearRoute]);

  const fetchRoute = useCallback(async (amenity) => {
    if (!mapboxgl.accessToken) return;
    setRouteLoading(true);
    setRouteError(null);
    setRouteInfo(null);
    setStepsOpen(false);

    const selectedHood = NEIGHBORHOODS.find(n => n.id === selectedId);
    const origin = userLngLat || selectedHood?.center || [-120.6606, 35.2800];

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${amenity.lng},${amenity.lat}?geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes?.length) throw new Error('No route found');

      const route = data.routes[0];
      const coords = route.geometry.coordinates;

      const steps = route.legs[0]?.steps?.map(s => ({
        instruction: s.maneuver.instruction,
        distance: fmtDist(s.distance),
      })) || [];

      setRouteInfo({
        distance: fmtDist(route.distance),
        duration: fmtDur(route.duration),
        destination: amenity.name,
        originLabel: userLngLat ? 'your location' : (selectedHood?.name || 'SLO'),
        steps,
      });

      drawRoute(coords, amenity);
    } catch {
      setRouteError('Could not fetch route. Check your Mapbox token.');
    } finally {
      setRouteLoading(false);
    }
  }, [selectedId, userLngLat, drawRoute]);

  const handleAmenityClick = useCallback((amenity) => {
    setActiveAmenity(amenity.id);
    fetchRoute(amenity);
  }, [fetchRoute]);

  const handleClearRoute = useCallback(() => {
    clearRoute();
    setRouteInfo(null);
    setRouteError(null);
    setActiveAmenity(null);
    setStepsOpen(false);
  }, [clearRoute]);

  // Reset camera when deselecting
  useEffect(() => {
    if (!mapLoaded || !map.current || selectedId) return;
    map.current.flyTo({ center: [-120.68, 35.30], zoom: 9.2, pitch: 58, bearing: -18, duration: 700 });
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

      {/* Affordability legend */}
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

      {/* Directions floating panel */}
      <div className={`route-panel ${routeOpen ? 'open' : ''}`}>
        <button
          className="route-toggle-btn"
          onClick={() => { setRouteOpen(o => !o); if (routeOpen) handleClearRoute(); }}
        >
          {routeOpen ? '✕ Close' : '↗ Directions'}
        </button>

        {routeOpen && (
          <div className="route-panel-body">
            <div className="route-origin-label">
              <span className="route-origin-dot" />
              {userLngLat ? 'Your GPS location' : selectedId ? `${NEIGHBORHOODS.find(n => n.id === selectedId)?.name ?? 'SLO'} area` : 'SLO area'}
            </div>

            <div className="route-amenity-grid">
              {ROUTE_AMENITIES.map(a => (
                <button
                  key={a.id}
                  className={`route-amenity-btn ${activeAmenity === a.id ? 'active' : ''}`}
                  onClick={() => handleAmenityClick(a)}
                  disabled={routeLoading}
                >
                  <span className="route-amenity-icon">{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>

            {routeLoading && (
              <div className="route-loading">
                <div className="spinner sm" />
                <span>Finding route…</span>
              </div>
            )}

            {routeError && <div className="route-error">{routeError}</div>}

            {routeInfo && !routeLoading && (
              <div className="route-result">
                <div className="route-summary">
                  <span className="route-dur">{routeInfo.duration}</span>
                  <span className="route-sep">·</span>
                  <span className="route-dist">{routeInfo.distance}</span>
                </div>
                <div className="route-dest-name">to {routeInfo.destination}</div>
                <div className="route-origin-note">from {routeInfo.originLabel}</div>

                {routeInfo.steps.length > 0 && (
                  <button className="route-steps-toggle" onClick={() => setStepsOpen(o => !o)}>
                    {stepsOpen ? '▲ Hide steps' : `▼ ${routeInfo.steps.length} turn-by-turn steps`}
                  </button>
                )}
                {stepsOpen && (
                  <ol className="route-steps">
                    {routeInfo.steps.map((s, i) => (
                      <li key={i}>
                        <span className="step-instruction">{s.instruction}</span>
                        <span className="step-dist">{s.distance}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <button className="route-clear-btn" onClick={handleClearRoute}>Clear route</button>
              </div>
            )}
          </div>
        )}
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

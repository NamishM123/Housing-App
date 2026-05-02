import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { NEIGHBORHOODS, getAffordabilityColor, getAffordabilityLabel, getHeatmapColor, matchesVibe } from '../data/neighborhoods';

function buildMarkerEl(listing, isShortlisted) {
  const el = document.createElement('div');
  el.className = 'listing-pin' + (isShortlisted ? ' shortlisted' : '');
  el.title = listing.address;
  const k = listing.price >= 1000 ? `$${(listing.price / 1000).toFixed(1)}k` : `$${listing.price}`;
  el.innerHTML = `<span>${k}</span>`;
  return el;
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

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

// Route color/style per travel mode
const MODE_COLORS = {
  driving: { glow: '#5B8CF7', casing: '#2B5CE6', line: '#A5C0FF', dash: null },
  walking: { glow: '#34D399', casing: '#059669', line: '#6EE7B7', dash: [2, 1.5] },
  transit: { glow: '#2DD4BF', casing: '#0D9488', line: '#99F6E4', dash: [3, 1.2] },
};

function fmtDist(metres) {
  const miles = metres * 0.000621371;
  return miles < 0.1 ? `${Math.round(metres)} m` : `${miles.toFixed(1)} mi`;
}
function fmtDur(seconds) {
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function MapView({
  monthlyIncome, roommates, maxRent, vibe,
  onNeighborhoodSelect, selectedId,
  listings, shortlist, onListingSelect,
  selectedListing,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const monthlyIncomeRef = useRef(monthlyIncome);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Routing state
  const [routeOpen, setRouteOpen] = useState(false);
  const [activeAmenity, setActiveAmenity] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [travelMode, setTravelMode] = useState('driving');

  // ── Map init ─────────────────────────────────────────
  useEffect(() => {
    if (map.current) return;
    if (!mapboxgl.accessToken) { setMapError(true); return; }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-108, 32],
        zoom: 2.8,
        pitch: 0,
        bearing: 0,
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
        map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

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

  // ── Neighborhood overlays (heatmap-style glow + event fill + outline + label) ──
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    NEIGHBORHOODS.forEach((hood) => {
      const sourceId  = `hood-${hood.id}`;
      const fillId    = `fill-${hood.id}`;
      const outlineId = `outline-${hood.id}`;
      const glowId    = `glow-${hood.id}`;
      const labelId   = `label-${hood.id}`;
      const labelSource = `label-src-${hood.id}`;

      const effectiveRent = roommates > 0 ? Math.round(hood.avgRent / (roommates + 1)) : hood.avgRent;
      const vibeMatch = matchesVibe(hood, vibe);
      const isSelected = hood.id === selectedId;
      const color = monthlyIncome > 0 ? getAffordabilityColor(effectiveRent, monthlyIncome, maxRent) : '#64748b';
      const heatColor = getHeatmapColor(effectiveRent, monthlyIncome, maxRent);

      // ── Point source (center) — used for glow circle and label ──
      const labelGeojson = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: hood.center },
        properties: { name: hood.name },
      };
      if (map.current.getSource(labelSource)) {
        map.current.getSource(labelSource).setData(labelGeojson);
      } else {
        map.current.addSource(labelSource, { type: 'geojson', data: labelGeojson });
      }

      // ── Heatmap-style glow circle — dark atmospheric colors, heavy blur ──
      const glowOpacity = vibeMatch ? (isSelected ? 0.82 : 0.52) : 0.06;
      if (map.current.getLayer(glowId)) {
        map.current.setPaintProperty(glowId, 'circle-color', heatColor);
        map.current.setPaintProperty(glowId, 'circle-opacity', glowOpacity);
      } else {
        map.current.addLayer({
          id: glowId, type: 'circle', source: labelSource,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 7.5, 22, 9, 44, 10.5, 80, 12, 140, 14, 210],
            'circle-color': heatColor,
            'circle-opacity': glowOpacity,
            'circle-blur': 0.88,
            'circle-pitch-alignment': 'map',
            'circle-pitch-scale': 'map',
          },
        });
      }

      // ── Polygon source (used by fill + outline) ──
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

      // ── Transparent fill — invisible but captures click/hover events ──
      // Keep a minimal opacity so the polygon boundary is interactable
      const fillOpacity = vibeMatch ? 0.04 : 0.01;
      if (map.current.getLayer(fillId)) {
        map.current.setPaintProperty(fillId, 'fill-opacity', fillOpacity);
      } else {
        map.current.addLayer({
          id: fillId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': fillOpacity,
            'fill-antialias': true,
          },
        });

        map.current.on('click', fillId, () => {
          onNeighborhoodSelect({ ...hood, avgRent: effectiveRent });
          map.current.flyTo({ center: hood.center, zoom: 12, pitch: 50, bearing: -8, duration: 900 });
        });

        map.current.on('mouseenter', fillId, () => {
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

        map.current.on('mouseleave', fillId, () => {
          map.current.getCanvas().style.cursor = '';
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        });
      }

      // ── Outline — uses heatmap color for consistent subdued look ──
      if (map.current.getLayer(outlineId)) {
        map.current.setPaintProperty(outlineId, 'line-color', heatColor);
        map.current.setPaintProperty(outlineId, 'line-width', isSelected ? 2.5 : 1.2);
        map.current.setPaintProperty(outlineId, 'line-opacity', vibeMatch ? (isSelected ? 0.95 : 0.65) : 0.08);
      } else {
        map.current.addLayer({
          id: outlineId, type: 'line', source: sourceId,
          paint: {
            'line-color': heatColor,
            'line-width': isSelected ? 2.5 : 1.2,
            'line-opacity': vibeMatch ? 0.65 : 0.08,
            'line-blur': 0.8,
          },
        });
      }

      // ── Label ─────────────────────────────────────────
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
            'text-halo-color': 'rgba(0,0,0,0.9)',
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
      const isSelected = selectedListing?.id === listing.id;
      const el = buildMarkerEl(listing, isShortlisted);
      if (isSelected) el.classList.add('origin-pin');

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
            <div style="font-size:10px;color:#38bdf8;margin-top:4px">Click to use as route origin</div>
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
  }, [mapLoaded, listings, shortlist, onListingSelect, selectedListing]);

  // ── User location dot (when no listing selected) ──
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (selectedListing) return;

    const selectedHood = NEIGHBORHOODS.find(n => n.id === selectedId);
    if (!selectedHood) return;

    const el = document.createElement('div');
    el.className = 'user-location-dot';
    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(selectedHood.center)
      .addTo(map.current);
  }, [mapLoaded, selectedId, selectedListing]);

  // ── Route rendering ───────────────────────────────────
  const clearRoute = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (!map.current) return;
    ['route-glow', 'route-casing', 'route-line'].forEach(id => {
      if (map.current.getLayer(id)) map.current.removeLayer(id);
    });
    if (map.current.getSource('route')) map.current.removeSource('route');
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
  }, []);

  const drawRoute = useCallback((coords, amenity, mode = 'driving') => {
    if (!map.current) return;
    clearRoute();

    const colors = MODE_COLORS[mode] || MODE_COLORS.driving;

    const destEl = document.createElement('div');
    destEl.className = 'dest-marker';
    destEl.innerHTML = amenity.icon;
    destMarkerRef.current = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
      .setLngLat([amenity.lng, amenity.lat])
      .addTo(map.current);

    map.current.addSource('route', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }] },
    });

    map.current.addLayer({
      id: 'route-glow', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': colors.glow, 'line-width': 16, 'line-opacity': 0.18, 'line-blur': 6 },
    });
    map.current.addLayer({
      id: 'route-casing', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': colors.casing, 'line-width': 6, 'line-opacity': 0.90 },
    });
    map.current.addLayer({
      id: 'route-line', type: 'line', source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': colors.dash ? 'butt' : 'round',
      },
      paint: {
        'line-color': colors.line,
        'line-width': 2.5,
        'line-opacity': 1,
        ...(colors.dash ? { 'line-dasharray': colors.dash } : {}),
      },
    });

    const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
    map.current.fitBounds(bounds, { padding: 100, pitch: 50, bearing: -10, duration: 1100 });

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

  const fetchRoute = useCallback(async (amenity, modeOverride) => {
    if (!mapboxgl.accessToken) return;
    setRouteLoading(true);
    setRouteError(null);
    setRouteInfo(null);
    setStepsOpen(false);

    const mode = modeOverride ?? travelMode;
    const profile = mode === 'transit' ? 'driving' : mode;

    const selectedHood = NEIGHBORHOODS.find(n => n.id === selectedId);
    const listingOrigin = selectedListing?.lng && selectedListing?.lat
      ? [selectedListing.lng, selectedListing.lat]
      : null;
    const origin = listingOrigin || selectedHood?.center || [-120.6606, 35.2800];
    const originLabel = listingOrigin
      ? selectedListing.address
      : (selectedHood?.name ? `${selectedHood.name} area` : 'SLO');

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin[0]},${origin[1]};${amenity.lng},${amenity.lat}?geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes?.length) throw new Error('No route found');

      const route = data.routes[0];
      const rawDuration = mode === 'transit' ? route.duration * 3 : route.duration;
      const steps = route.legs[0]?.steps?.map(s => ({
        instruction: s.maneuver.instruction,
        distance: fmtDist(s.distance),
      })) || [];

      setRouteInfo({
        distance: fmtDist(route.distance),
        duration: fmtDur(rawDuration),
        modeLabel: mode === 'transit' ? 'Via SLO Transit (est.)' : null,
        destination: amenity.name,
        originLabel,
        steps,
      });
      drawRoute(route.geometry.coordinates, amenity, mode);
    } catch {
      setRouteError('Could not fetch route. Check your Mapbox token.');
    } finally {
      setRouteLoading(false);
    }
  }, [selectedId, selectedListing, travelMode, drawRoute]);

  const handleAmenityClick = useCallback((amenity) => {
    setActiveAmenity(amenity.id);
    fetchRoute(amenity);
  }, [fetchRoute]);

  const handleModeChange = useCallback((newMode) => {
    setTravelMode(newMode);
    if (activeAmenity) {
      const amenity = ROUTE_AMENITIES.find(a => a.id === activeAmenity);
      if (amenity) fetchRoute(amenity, newMode);
    }
  }, [activeAmenity, fetchRoute]);

  const handleClearRoute = useCallback(() => {
    clearRoute();
    setRouteInfo(null);
    setRouteError(null);
    setActiveAmenity(null);
    setStepsOpen(false);
  }, [clearRoute]);

  // Keep ref in sync so deselect zoom can read current income without dep
  useEffect(() => { monthlyIncomeRef.current = monthlyIncome; }, [monthlyIncome]);

  // After form submit: dramatic globe → SLO zoom-in
  useEffect(() => {
    if (!mapLoaded || !map.current || !monthlyIncome) return;
    map.current.flyTo({
      center: [-120.68, 35.27],
      zoom: 10.8,
      pitch: 54,
      bearing: -14,
      duration: 3200,
      essential: true,
      curve: 1.8,   // tighter arc = more dramatic deceleration at target
      speed: 0.8,
    });
  }, [mapLoaded, monthlyIncome]);

  // Reset camera when deselecting a neighborhood
  useEffect(() => {
    if (!mapLoaded || !map.current || selectedId) return;
    const hasForm = monthlyIncomeRef.current > 0;
    map.current.flyTo({
      center: hasForm ? [-120.68, 35.30] : [-108, 32],
      zoom: hasForm ? 10.8 : 2.8,
      pitch: hasForm ? 54 : 0,
      bearing: hasForm ? -14 : 0,
      duration: 1200,
    });
  }, [mapLoaded, selectedId]);

  // ── Fallback (no token) ───────────────────────────────
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

  const originLabel = selectedListing?.address
    ? selectedListing.address
    : selectedId
      ? (NEIGHBORHOODS.find(n => n.id === selectedId)?.name ?? 'SLO') + ' area'
      : 'SLO area';

  const modeColors = MODE_COLORS[travelMode] || MODE_COLORS.driving;

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />

      {/* Affordability legend — bottom RIGHT */}
      <div className="map-legend">
        <div className="legend-title">Affordability</div>
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
        {vibe && vibe !== 'any' && <div className="legend-filter">Vibe: <strong>{vibe}</strong></div>}
      </div>

      {/* Directions floating panel — bottom LEFT */}
      <div className={`route-panel ${routeOpen ? 'open' : ''}`}>
        <button
          className="route-toggle-btn"
          onClick={() => { setRouteOpen(o => !o); if (routeOpen) handleClearRoute(); }}
        >
          {routeOpen ? '✕ Close' : '↗ Directions'}
        </button>

        {routeOpen && (
          <div className="route-panel-body">
            {/* Origin label */}
            <div className="route-origin-label">
              <span className="route-origin-dot" />
              <span>
                {selectedListing
                  ? <><strong style={{ color: '#38bdf8' }}>From:</strong> {selectedListing.address}</>
                  : <span style={{ color: '#64748b' }}>Click a listing pin to set origin</span>
                }
              </span>
            </div>

            {/* Travel mode toggle */}
            <div className="route-mode-toggle">
              {[
                { id: 'driving', label: '🚗 Drive' },
                { id: 'walking', label: '🚶 Walk' },
                { id: 'transit', label: '🚌 Transit' },
              ].map(m => (
                <button
                  key={m.id}
                  className={`mode-btn ${travelMode === m.id ? 'active' : ''}`}
                  style={travelMode === m.id ? { borderColor: modeColors.casing, background: `${modeColors.casing}22`, color: modeColors.line } : {}}
                  onClick={() => handleModeChange(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Destination buttons */}
            <div className="route-amenity-grid">
              {ROUTE_AMENITIES.map(a => (
                <button
                  key={a.id}
                  className={`route-amenity-btn ${activeAmenity === a.id ? 'active' : ''}`}
                  style={activeAmenity === a.id ? { borderColor: modeColors.casing, background: `${modeColors.casing}22` } : {}}
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
                  <span className="route-dur" style={{ color: modeColors.line }}>{routeInfo.duration}</span>
                  <span className="route-sep">·</span>
                  <span className="route-dist">{routeInfo.distance}</span>
                </div>
                {routeInfo.modeLabel && (
                  <div className="route-mode-note" style={{ color: modeColors.glow }}>{routeInfo.modeLabel}</div>
                )}
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

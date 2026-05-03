import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { NEIGHBORHOODS, getAffordabilityColor, getAffordabilityLabel, getHeatmapColor, matchesVibe } from '../data/neighborhoods';
import SatellitePreview from './SatellitePreview';
import { GlowCard } from './GlowCard';

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
  { id: 'grocery', label: 'Grocery', icon: '🛒', name: "Trader Joe's SLO", lng: -120.6681, lat: 35.2792 },
  { id: 'hospital', label: 'Hospital', icon: '🏥', name: 'Sierra Vista Regional', lng: -120.6700, lat: 35.2683 },
  { id: 'gym', label: 'Gym', icon: '💪', name: 'Planet Fitness SLO', lng: -120.6640, lat: 35.2831 },
  { id: 'beach', label: 'Beach', icon: '🏖️', name: 'Avila Beach', lng: -120.7295, lat: 35.1793 },
  { id: 'trails', label: 'Trails', icon: '🥾', name: 'Bishop Peak Trailhead', lng: -120.6982, lat: 35.3009 },
  { id: 'downtown', label: 'Downtown', icon: '🏙️', name: 'Downtown SLO', lng: -120.6606, lat: 35.2800 },
  { id: 'calpoly', label: 'Cal Poly', icon: '🎓', name: 'Cal Poly SLO', lng: -120.6596, lat: 35.3050 },
  { id: 'airport', label: 'Airport', icon: '✈️', name: 'SLO Airport', lng: -120.6417, lat: 35.2368 },
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
  onNeighborhoodSelect, onNeighborhoodHover, selectedId,
  listings, shortlist, onListingSelect,
  selectedListing,
  landingActive = false,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const monthlyIncomeRef = useRef(monthlyIncome);
  const flownRef = useRef(false);
  const onNeighborhoodHoverRef = useRef(onNeighborhoodHover);
  useEffect(() => { onNeighborhoodHoverRef.current = onNeighborhoodHover; }, [onNeighborhoodHover]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapZoom, setMapZoom] = useState(9.5);

  // Satellite preview modal target
  const [previewListing, setPreviewListing] = useState(null);

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
        projection: 'globe',
        center: [-95, 25],   // US-prominent globe view (shifted right by padding below)
        zoom: 1.45,          // matches landing globe zoom
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
            'sky-atmosphere-sun-intensity': 6,
            'sky-atmosphere-color': 'rgba(8, 20, 60, 1.0)',
            'sky-atmosphere-halo-color': 'rgba(60, 120, 230, 0.20)',
          },
        });

        // Globe atmosphere — soft medium-blue rim
        map.current.setFog({
          color:            'rgba(120, 165, 220, 0.32)', // medium blue
          'high-color':     'rgba(60, 110, 190, 0.22)',  // darker upper atmosphere
          'horizon-blend':  0.04,
          'space-color':    'rgb(2, 6, 18)',
          'star-intensity': 0,
        });

        // Hide admin/country/state border line layers so outlines don't show
        map.current.getStyle().layers.forEach(layer => {
          const id = layer.id.toLowerCase();
          if (
            layer.type === 'line' && (
              id.includes('admin') ||
              id.includes('border') ||
              id.includes('boundary') ||
              id.includes('state-line') ||
              id.includes('country')
            )
          ) {
            map.current.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        });

        // Push the globe rightward so the US sits in the right portion of the
        // viewport (the form sidebar covers the left ~440px once the landing
        // dismisses). The fly-into-California ease eases this back to 0.
        map.current.setPadding({
          top: 0, right: 0, bottom: 0,
          left: Math.min(window.innerWidth * 0.32, 460),
        });

        setMapLoaded(true);
      });

      map.current.on('zoom', () => {
        setMapZoom(map.current.getZoom());
      });

      map.current.on('error', () => setMapError(true));
    } catch { setMapError(true); }

    return () => { if (map.current) { map.current.remove(); map.current = null; } };
  }, []);

  // ── Spotlight pointer-tracker on the NavigationControl ───────────
  useEffect(() => {
    if (!mapLoaded) return;
    const ctrl = mapContainer.current?.querySelector('.mapboxgl-ctrl-group');
    if (!ctrl) return;

    const onMove = (e) => {
      const rect = ctrl.getBoundingClientRect();
      ctrl.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
      ctrl.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
      ctrl.style.setProperty('--glow-active', '1');
    };
    const onLeave = () => ctrl.style.setProperty('--glow-active', '0');

    ctrl.addEventListener('pointermove', onMove);
    ctrl.addEventListener('pointerenter', onMove);
    ctrl.addEventListener('pointerleave', onLeave);
    return () => {
      ctrl.removeEventListener('pointermove', onMove);
      ctrl.removeEventListener('pointerenter', onMove);
      ctrl.removeEventListener('pointerleave', onLeave);
    };
  }, [mapLoaded]);

  // ── Cinematic intro: when the landing dismisses, fly the camera from the
  //    US-prominent globe view down into California (SLO).
  useEffect(() => {
    if (landingActive) return;
    if (flownRef.current) return;
    if (!mapLoaded || !map.current) return;
    flownRef.current = true;

    const m = map.current;

    // Quick beat at globe-out, then fly into California while easing the
    // right-shift padding back to 0.
    const flyDelay = 350;
    const t = setTimeout(() => {
      m.flyTo({
        center: [-120.66, 36.0],
        zoom: 5.4,
        duration: 2600,
        essential: true,
        easing: (x) => 1 - Math.pow(1 - x, 3),
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    }, flyDelay);

    return () => clearTimeout(t);
  }, [landingActive, mapLoaded]);

  // ── Neighborhood overlays (heatmap-style glow + event fill + outline + label) ──
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    NEIGHBORHOODS.forEach((hood) => {
      const sourceId = `hood-${hood.id}`;
      const fillId = `fill-${hood.id}`;
      const glowId = `glow-${hood.id}`;
      const labelId = `label-${hood.id}`;
      const labelSource = `label-src-${hood.id}`;

      // ── Zoom-gated visibility ──
      const currentZoom = map.current.getZoom();
      const belowMin = hood.minZoom && currentZoom < hood.minZoom;
      const aboveMax = hood.maxZoom && currentZoom >= hood.maxZoom;
      const zoomHidden = belowMin || aboveMax;

      // If layers exist, just toggle visibility and skip the rest
      if (map.current.getLayer(fillId)) {
        const vis = zoomHidden ? 'none' : 'visible';
        [fillId, glowId, labelId].forEach(id => {
          if (map.current.getLayer(id)) {
            try {
              map.current.setLayoutProperty(id, 'visibility', vis);
            } catch (e) {
              // Layer might not exist yet, ignore
            }
          }
        });
        if (zoomHidden) return;
      } else if (zoomHidden) {
        return; // Don't add layers yet if we're outside zoom range
      }

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

      // ── Heatmap-style glow circle — covers full area at low zoom, fades on zoom-in ──
      // Gated on monthlyIncome > 0 so the map is clean until the user
      // submits the "Show me what fits" form.
      const heatmapVisible = monthlyIncome > 0;
      const glowOpacityBase = vibeMatch ? (isSelected ? 0.82 : 0.52) : 0.06;
      const glowOpacityZoom = !heatmapVisible ? 0 : [
        'interpolate', ['linear'], ['zoom'],
        9, glowOpacityBase,   // full opacity when zoomed out
        12, glowOpacityBase,   // start fading
        13.5, 0,               // fully gone when zoomed in
      ];
      if (map.current.getLayer(glowId)) {
        map.current.setPaintProperty(glowId, 'circle-color', heatColor);
        map.current.setPaintProperty(glowId, 'circle-opacity', glowOpacityZoom);
      } else {
        map.current.addLayer({
          id: glowId, type: 'circle', source: labelSource,
          paint: {
            // Large enough to blanket the whole neighborhood polygon at low zoom
            'circle-radius': ['interpolate', ['linear'], ['zoom'],
              7, 60,
              9, 120,
              10.5, 200,
              12, 320,
              13.5, 420,
            ],
            'circle-color': heatColor,
            'circle-opacity': glowOpacityZoom,
            'circle-blur': 0.92,
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
      const fillOpacity = !heatmapVisible ? 0.01 : (vibeMatch ? 0.04 : 0.01);
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
          map.current.flyTo({ center: hood.center, zoom: 12.5, pitch: 50, bearing: -8, duration: 900 });
        });

        // Simple hover effects + dock-peek: hovering a polygon previews the city
        // in the bottom dock without firing API calls or camera moves.
        map.current.on('mouseenter', fillId, () => {
          map.current.getCanvas().style.cursor = 'pointer';
          if (onNeighborhoodHoverRef.current) {
            onNeighborhoodHoverRef.current({ ...hood, avgRent: effectiveRent });
          }
        });

        map.current.on('mouseleave', fillId, () => {
          map.current.getCanvas().style.cursor = '';
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
  }, [mapLoaded, mapZoom, monthlyIncome, roommates, maxRent, vibe, selectedId, onNeighborhoodSelect]);

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

      // Store listing reference for popup button click
      window[`__openStreetView_${listing.id}`] = () => {
        setPreviewListing(listing);
      };

      const popup = new mapboxgl.Popup({ offset: [0, -28], closeButton: false, maxWidth: 'none' })
        .setHTML(`
          <button
            onclick="window.__openStreetView_${listing.id}()"
            style="font-family:system-ui;padding:10px 16px;background:#3b82f6;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.03em;box-shadow:0 4px 12px rgba(59,130,246,0.4);transition:all 0.2s;white-space:nowrap"
            onmouseover="this.style.background='#2563eb';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(59,130,246,0.5)'"
            onmouseout="this.style.background='#3b82f6';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(59,130,246,0.4)'"
          >🚶 Street View</button>
        `);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([listing.lng, listing.lat])
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onListingSelect) onListingSelect(listing);
        // Open street view preview when clicking the pin
        setPreviewListing(listing);
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, listings, shortlist, onListingSelect, selectedListing]);


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
      zoom: 9.5,
      pitch: 54,
      bearing: -14,
      duration: 3200,
      essential: true,
      curve: 1.8,
      speed: 0.8,
    });
  }, [mapLoaded, monthlyIncome]);

  // Reset camera when deselecting a neighborhood
  useEffect(() => {
    if (!mapLoaded || !map.current || selectedId) return;
    const hasForm = monthlyIncomeRef.current > 0;
    map.current.flyTo({
      center: hasForm ? [-120.68, 35.30] : [-108, 32],
      zoom: hasForm ? 9.5 : 2.8,
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
              const r = roommates > 0 ? Math.round(hood.avgRent / (roommates + 1)) : hood.avgRent;
              const color = monthlyIncome > 0 ? getAffordabilityColor(r, monthlyIncome, maxRent) : '#6b7280';
              const label = monthlyIncome > 0 ? getAffordabilityLabel(r, monthlyIncome, maxRent) : '—';
              const vm = matchesVibe(hood, vibe);
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
      <GlowCard
        className="map-legend"
        style={{ position: 'absolute', bottom: 24, right: 16, zIndex: 5, padding: '10px 12px' }}
      >
        <div className="legend-title">Affordability</div>
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
        {vibe && vibe !== 'any' && <div className="legend-filter">Vibe: <strong>{vibe}</strong></div>}
      </GlowCard>

      {/* Directions floating panel — bottom LEFT */}
      <div className={`route-panel ${routeOpen ? 'open' : ''}`}>
        {!routeOpen ? (
          <GlowCard
            as="button"
            className="route-toggle-btn"
            radius={18}
            border={2}
            size={220}
            glowColor="blue"
            onClick={() => setRouteOpen(true)}
          >
            Directions
          </GlowCard>
        ) : (
          <GlowCard
            className="route-panel-body"
            radius={22}
            border={2}
            size={280}
            glowColor="blue"
          >
            <button
              className="route-minimize-btn"
              onClick={() => { setRouteOpen(false); handleClearRoute(); }}
              aria-label="Minimize directions"
              title="Minimize"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>

            {/* Origin label */}
            <div className="route-origin-label">
              <span className="route-origin-dot" />
              <span>
                {selectedListing
                  ? <><strong className="route-from-label">From:</strong> {selectedListing.address}</>
                  : <span className="route-origin-empty">Click a listing pin to set origin</span>
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
          </GlowCard>
        )}
      </div>

      {!mapLoaded && (
        <div className="map-loading">
          <div className="spinner" />
          <span>Loading 3D map…</span>
        </div>
      )}

      {previewListing && (
        <SatellitePreview
          listing={previewListing}
          onClose={() => setPreviewListing(null)}
        />
      )}
    </div>
  );
}

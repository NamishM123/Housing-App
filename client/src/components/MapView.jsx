import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { NEIGHBORHOODS, getAffordabilityColor, getAffordabilityLabel } from '../data/neighborhoods';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const LEGEND = [
  { color: '#22c55e', label: 'Comfortable (<28%)' },
  { color: '#14b8a6', label: 'Manageable (28–35%)' },
  { color: '#f59e0b', label: 'Tight (35–45%)' },
  { color: '#ef4444', label: 'Out of Range (>45%)' },
];

export default function MapView({ monthlyIncome, roommates, onNeighborhoodSelect, selectedId }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (map.current) return;
    if (!mapboxgl.accessToken) {
      setMapError(true);
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-120.66, 35.28],
        zoom: 9.5,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => setMapLoaded(true));
      map.current.on('error', () => setMapError(true));
    } catch {
      setMapError(true);
    }

    return () => {
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    NEIGHBORHOODS.forEach((hood) => {
      const sourceId = `hood-${hood.id}`;
      const layerId = `layer-${hood.id}`;
      const outlineId = `outline-${hood.id}`;

      const effectiveRent = roommates > 0 ? Math.round(hood.avgRent / (roommates + 1)) : hood.avgRent;
      const color = monthlyIncome > 0 ? getAffordabilityColor(effectiveRent, monthlyIncome) : '#6b7280';

      const geojson = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [hood.polygon],
        },
        properties: { id: hood.id, name: hood.name },
      };

      if (map.current.getSource(sourceId)) {
        map.current.getSource(sourceId).setData(geojson);
        if (map.current.getLayer(layerId)) {
          map.current.setPaintProperty(layerId, 'fill-color', color);
          map.current.setPaintProperty(layerId, 'fill-opacity', hood.id === selectedId ? 0.75 : 0.55);
        }
      } else {
        map.current.addSource(sourceId, { type: 'geojson', data: geojson });
        map.current.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': hood.id === selectedId ? 0.75 : 0.55,
          },
        });
        map.current.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color,
            'line-width': hood.id === selectedId ? 3 : 1.5,
            'line-opacity': 0.9,
          },
        });

        map.current.on('click', layerId, (e) => {
          onNeighborhoodSelect({ ...hood, avgRent: effectiveRent });
        });

        map.current.on('mouseenter', layerId, (e) => {
          map.current.getCanvas().style.cursor = 'pointer';
          const effectiveRentNow = roommates > 0 ? Math.round(hood.avgRent / (roommates + 1)) : hood.avgRent;
          const label = monthlyIncome > 0 ? getAffordabilityLabel(effectiveRentNow, monthlyIncome) : 'Enter your salary';
          popupRef.current = new mapboxgl.Popup({ closeButton: false, offset: 10 })
            .setLngLat(hood.center)
            .setHTML(`
              <div style="font-family:system-ui;padding:8px 12px;background:#1e293b;border-radius:8px;color:#f1f5f9;min-width:160px">
                <div style="font-weight:700;font-size:14px;margin-bottom:4px">${hood.name}</div>
                <div style="color:#94a3b8;font-size:12px">Avg Rent: <strong style="color:#f1f5f9">$${effectiveRentNow.toLocaleString()}/mo</strong></div>
                <div style="color:#94a3b8;font-size:12px">Walk Score: <strong style="color:#f1f5f9">${hood.walkScore}</strong></div>
                ${monthlyIncome > 0 ? `<div style="margin-top:6px;font-size:12px;font-weight:600;color:${getAffordabilityColor(effectiveRentNow, monthlyIncome)}">${label}</div>` : ''}
              </div>
            `)
            .addTo(map.current);
        });

        map.current.on('mouseleave', layerId, () => {
          map.current.getCanvas().style.cursor = '';
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        });
      }

      if (map.current.getLayer(outlineId)) {
        map.current.setPaintProperty(outlineId, 'line-width', hood.id === selectedId ? 3 : 1.5);
        map.current.setPaintProperty(outlineId, 'line-color', color);
      }
    });
  }, [mapLoaded, monthlyIncome, roommates, selectedId, onNeighborhoodSelect]);

  if (mapError || !mapboxgl.accessToken) {
    return (
      <div className="map-fallback">
        <div className="map-fallback-inner">
          <h3>Map Preview</h3>
          <p>Add your <code>VITE_MAPBOX_TOKEN</code> to enable the interactive map.</p>
          <div className="neighborhood-grid">
            {NEIGHBORHOODS.map(hood => {
              const effectiveRent = roommates > 0 ? Math.round(hood.avgRent / (roommates + 1)) : hood.avgRent;
              const color = monthlyIncome > 0 ? getAffordabilityColor(effectiveRent, monthlyIncome) : '#6b7280';
              const label = monthlyIncome > 0 ? getAffordabilityLabel(effectiveRent, monthlyIncome) : '—';
              return (
                <button
                  key={hood.id}
                  className={`neighborhood-card ${hood.id === selectedId ? 'selected' : ''}`}
                  style={{ borderColor: color }}
                  onClick={() => onNeighborhoodSelect({ ...hood, avgRent: effectiveRent })}
                >
                  <div className="neighborhood-card-name">{hood.name}</div>
                  <div className="neighborhood-card-rent">${effectiveRent.toLocaleString()}/mo</div>
                  <div className="neighborhood-card-label" style={{ color }}>{label}</div>
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
      </div>
      {!mapLoaded && (
        <div className="map-loading">
          <div className="spinner" />
          <span>Loading map…</span>
        </div>
      )}
    </div>
  );
}

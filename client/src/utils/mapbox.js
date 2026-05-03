const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const SLO_BBOX = [-120.85, 35.05, -120.35, 35.45];
const SLO_PROXIMITY = '-120.6596,35.2828';

export async function geocodePlaces(query, { signal } = {}) {
  if (!query || query.trim().length < 2) return [];
  if (!TOKEN) return [];
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${TOKEN}` +
    `&autocomplete=true&limit=5` +
    `&proximity=${SLO_PROXIMITY}` +
    `&bbox=${SLO_BBOX.join(',')}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map(f => ({
      label: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
    }));
  } catch {
    return [];
  }
}

export async function commuteMatrix(origin, destinations) {
  if (!TOKEN || !origin || !destinations?.length) return [];
  const coords = [origin, ...destinations]
    .map(p => `${p.lng},${p.lat}`)
    .join(';');
  const url =
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
    `?access_token=${TOKEN}` +
    `&sources=0` +
    `&destinations=${destinations.map((_, i) => i + 1).join(';')}` +
    `&annotations=duration`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.durations?.[0] || []).map(seconds =>
      seconds == null ? null : Math.round(seconds / 60),
    );
  } catch {
    return [];
  }
}

// Forward-geocode a single address into accurate lat/lng. Used to refine
// listing pin positions so they actually sit on the building rather than
// the parcel center / approximate coords from upstream APIs.
const geocodeCache = new Map();

export async function geocodeAddress(address, city = 'San Luis Obispo', zip = '') {
  if (!address || !TOKEN) return null;
  const key = `${address}|${city}|${zip}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  const q = [address, city, zip, 'CA'].filter(Boolean).join(', ');
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${TOKEN}` +
    `&types=address,poi&limit=1` +
    `&proximity=${SLO_PROXIMITY}` +
    `&bbox=${SLO_BBOX.join(',')}`;

  try {
    const res = await fetch(url);
    if (!res.ok) { geocodeCache.set(key, null); return null; }
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) { geocodeCache.set(key, null); return null; }
    const out = { lat: f.center[1], lng: f.center[0] };
    geocodeCache.set(key, out);
    return out;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

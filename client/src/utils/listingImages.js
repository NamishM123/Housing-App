import mapboxgl from 'mapbox-gl';

const GOOGLE_KEY =
  import.meta.env.VITE_GOOGLE_STREETVIEW_KEY ||
  import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY ||
  '';

export const PLACEHOLDER_IMG = '/listing-placeholder.svg';

// Street View Static — returns an actual photograph of the building at the
// listing's lat/lng, taken from the nearest Google Street View pano. This is
// what users actually want: a real photo of the house, not a top-down map.
function streetViewUrl(lat, lng, { heading = 0, size = '720x440', fov = 85 } = {}) {
  if (!GOOGLE_KEY || lat == null || lng == null) return null;
  const params = new URLSearchParams({
    size,
    location: `${lat},${lng}`,
    heading: String(heading),
    pitch: '0',
    fov: String(fov),
    source: 'outdoor',
    return_error_code: 'true', // 404 (instead of grey "no imagery") so onError fires cleanly
    key: GOOGLE_KEY,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

// Top-down aerial centered exactly on the listing's lat/lng. No pitch, no
// bearing offset, so the address is in the dead center of the frame — fixes
// the "random location" issue caused by the previous oblique 55° pitch.
function mapboxAerialUrl(lat, lng, size = '720x440') {
  if (!mapboxgl.accessToken || lat == null || lng == null) return null;
  const [w, h] = size.split('x');
  const lngF = lng.toFixed(5);
  const latF = lat.toFixed(5);
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lngF},${latF},18,0,0/${w}x${h}@2x?access_token=${mapboxgl.accessToken}&attribution=false&logo=false`;
}

// Ordered fallback chain for a single listing card thumbnail:
//   1. real listing photo (RentCast)
//   2. Google Street View at the actual address
//   3. top-down Mapbox aerial centered on the actual address
//   4. local SVG placeholder
// Returned in chain order so callers can drive an onError fallback by
// stepping to the next entry.
export function listingCardChain(listing) {
  const chain = [];
  if (listing.image) chain.push({ src: listing.image, kind: 'photo' });

  const sv = streetViewUrl(listing.lat, listing.lng, { size: '720x440', heading: 0 });
  if (sv) chain.push({ src: sv, kind: 'streetview' });

  const aerial = mapboxAerialUrl(listing.lat, listing.lng, '720x440');
  if (aerial) chain.push({ src: aerial, kind: 'aerial' });

  chain.push({ src: PLACEHOLDER_IMG, kind: 'placeholder' });
  return chain;
}

// Gallery for the detail modal: real photos of the building from four
// compass headings (Street View), plus one top-down aerial for context.
// Every URL is centered on the listing's actual lat/lng.
export function listingGalleryImages(listing) {
  const out = [];
  if (listing.image) out.push({ src: listing.image, label: 'Listing photo', kind: 'photo' });

  if (listing.lat != null && listing.lng != null && GOOGLE_KEY) {
    const headings = [
      { h: 0,   label: 'Looking north' },
      { h: 90,  label: 'Looking east'  },
      { h: 180, label: 'Looking south' },
      { h: 270, label: 'Looking west'  },
    ];
    for (const { h, label } of headings) {
      const src = streetViewUrl(listing.lat, listing.lng, { heading: h, size: '900x520', fov: 90 });
      if (src) out.push({ src, label, kind: 'streetview' });
    }
  }

  // Single top-down aerial for context (centered on the address, no offset)
  const aerial = mapboxAerialUrl(listing.lat, listing.lng, '900x520');
  if (aerial) out.push({ src: aerial, label: 'Top-down aerial', kind: 'aerial' });

  if (!out.length) out.push({ src: PLACEHOLDER_IMG, label: 'Image unavailable', kind: 'placeholder' });
  return out;
}

export const HAS_STREETVIEW_KEY = !!GOOGLE_KEY;

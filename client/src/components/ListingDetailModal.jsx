import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

// Build a multi-image gallery for any listing using:
//   1. The real RentCast photo (when present)
//   2. Mapbox Static Images of the *actual* address from 4 angles — these
//      are real satellite imagery centered on the listing's lat/lng, so
//      every listing shows its true location instead of generic stock photos
//   3. A 3D-style oblique aerial as the establishing shot
function buildGallery(listing) {
  const token = mapboxgl.accessToken;
  const out = [];

  // RentCast photo first if present (real listing photo)
  if (listing.image) out.push({ src: listing.image, label: 'Listing photo', kind: 'photo' });

  if (listing.lat && listing.lng && token) {
    const lng = listing.lng.toFixed(5);
    const lat = listing.lat.toFixed(5);

    // Establishing 3D oblique
    out.push({
      src: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},18.2,-20,62/900x520@2x?access_token=${token}&attribution=false&logo=false`,
      label: 'Aerial — looking north',
      kind: 'aerial',
    });
    // North-facing
    out.push({
      src: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},18.6,0,70/900x520@2x?access_token=${token}&attribution=false&logo=false`,
      label: 'Looking north',
      kind: 'aerial',
    });
    // East-facing
    out.push({
      src: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},18.4,90,70/900x520@2x?access_token=${token}&attribution=false&logo=false`,
      label: 'Looking east',
      kind: 'aerial',
    });
    // South-facing
    out.push({
      src: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},18.4,180,70/900x520@2x?access_token=${token}&attribution=false&logo=false`,
      label: 'Looking south',
      kind: 'aerial',
    });
    // Wider neighborhood context
    out.push({
      src: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},16.5,0,30/900x520@2x?access_token=${token}&attribution=false&logo=false`,
      label: 'Neighborhood context',
      kind: 'aerial',
    });
  }

  return out;
}

function fmtFeature(f) { return f; }

export default function ListingDetailModal({
  listing,
  form,
  isShortlisted,
  onShortlist,
  onRequestTour,
  onClose,
}) {
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!listing) return null;

  const gallery = buildGallery(listing);
  const overBudget = form?.maxRent && listing.price > form.maxRent;
  const monthlyIncome = form?.salary ? Math.round(form.salary / 12) : null;
  const pctOfIncome = monthlyIncome ? Math.round((listing.price / monthlyIncome) * 100) : null;

  const next = () => setActiveImg(i => (i + 1) % Math.max(1, gallery.length));
  const prev = () => setActiveImg(i => (i - 1 + Math.max(1, gallery.length)) % Math.max(1, gallery.length));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal listing-detail-modal">
        <button className="close-btn listing-detail-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Hero gallery */}
        <div className="listing-gallery">
          {gallery.length > 0 ? (
            <>
              <img
                key={activeImg}
                src={gallery[activeImg].src}
                alt={`${listing.address} — ${gallery[activeImg].label}`}
                className="listing-gallery-image"
                onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
              />
              <div className="listing-gallery-label">{gallery[activeImg].label}</div>
              {gallery.length > 1 && (
                <>
                  <button className="gallery-nav prev" onClick={prev} aria-label="Previous">‹</button>
                  <button className="gallery-nav next" onClick={next} aria-label="Next">›</button>
                  <div className="gallery-dots">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        className={`gallery-dot ${i === activeImg ? 'active' : ''}`}
                        onClick={() => setActiveImg(i)}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="listing-gallery-empty">No images available</div>
          )}
        </div>

        {/* Thumbnail strip */}
        {gallery.length > 1 && (
          <div className="listing-thumbs">
            {gallery.map((g, i) => (
              <button
                key={i}
                className={`listing-thumb ${i === activeImg ? 'active' : ''}`}
                onClick={() => setActiveImg(i)}
              >
                <img src={g.src} alt={g.label} />
              </button>
            ))}
          </div>
        )}

        {/* Header / specs */}
        <div className="listing-detail-header">
          <div>
            <h2 className="listing-detail-address">{listing.address}</h2>
            <p className="listing-detail-sub">
              {listing.city}, CA {listing.zip} · {listing.type} · Available {listing.available}
            </p>
          </div>
          <button
            className={`shortlist-btn lg ${isShortlisted ? 'active' : ''}`}
            onClick={() => onShortlist(listing)}
            title={isShortlisted ? 'Remove from shortlist' : 'Save to shortlist'}
          >
            {isShortlisted ? '★' : '☆'}
          </button>
        </div>

        <div className="listing-detail-price-row">
          <div>
            <span className="listing-detail-price" style={{ color: overBudget ? 'var(--red)' : 'var(--green)' }}>
              ${listing.price?.toLocaleString()}<span className="listing-detail-price-unit">/mo</span>
            </span>
            {pctOfIncome != null && (
              <span className="listing-detail-pct">
                {pctOfIncome}% of your monthly income
              </span>
            )}
          </div>
          {overBudget && <span className="over-budget-badge">Over your ${form.maxRent.toLocaleString()} cap</span>}
        </div>

        <div className="listing-detail-stats">
          <Stat label="Bedrooms" value={listing.beds} />
          <Stat label="Bathrooms" value={listing.baths} />
          {listing.sqft && <Stat label="Sq ft" value={listing.sqft.toLocaleString()} />}
          {listing.petFriendly && <Stat label="Pets" value="🐾 OK" />}
        </div>

        {listing.features?.length > 0 && (
          <div className="listing-detail-section">
            <div className="listing-detail-section-title">Features</div>
            <div className="listing-features">
              {listing.features.map(f => <span key={f} className="feature-tag">{fmtFeature(f)}</span>)}
            </div>
          </div>
        )}

        <div className="listing-detail-section">
          <div className="listing-detail-section-title">Location</div>
          <p className="muted small">
            {listing.lat?.toFixed(4)}°, {listing.lng?.toFixed(4)}° — switch images above to see the address from different
            angles via Mapbox satellite imagery.
          </p>
        </div>

        <div className="listing-detail-actions">
          <button className="action-btn" onClick={() => onRequestTour(listing)}>
            📅 Request Tour
          </button>
          <button className="action-btn secondary" onClick={() => onShortlist(listing)}>
            {isShortlisted ? '★ Saved' : '☆ Save to shortlist'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="listing-detail-stat">
      <div className="listing-detail-stat-value">{value}</div>
      <div className="listing-detail-stat-label">{label}</div>
    </div>
  );
}

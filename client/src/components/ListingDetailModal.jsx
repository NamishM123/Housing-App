import { useEffect, useState } from 'react';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || '';

// Build a multi-image gallery of REAL building photos:
//   1. The real RentCast listing photo (when present).
//   2. Google Street View Static photos of the actual building from
//      multiple compass headings — real-world street-level imagery.
function buildGallery(listing) {
  const out = [];

  if (listing.image) {
    out.push({ src: listing.image, label: 'Listing photo', kind: 'photo' });
  }

  if (listing.lat && listing.lng && GOOGLE_KEY) {
    const loc = `${listing.lat},${listing.lng}`;
    const sv = (heading, label) => ({
      src: `https://maps.googleapis.com/maps/api/streetview?size=900x540&location=${loc}&heading=${heading}&fov=80&pitch=5&source=outdoor&key=${GOOGLE_KEY}`,
      label,
      kind: 'streetview',
    });
    out.push(sv(0,   'Front of building (N)'));
    out.push(sv(90,  'East side'));
    out.push(sv(180, 'Back / opposite side (S)'));
    out.push(sv(270, 'West side'));
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
          <div className="listing-detail-section-title">More photos</div>
          <p className="muted small" style={{ marginBottom: 10 }}>
            For the full interior photo gallery, open this listing on a rental platform:
          </p>
          <div className="platform-btns">
            <a
              href={listing.urls?.zillow || listing.zillowUrl
                || `https://www.zillow.com/homes/${encodeURIComponent(listing.address + ', ' + (listing.city || '') + ' ' + (listing.zip || ''))}_rb/`}
              target="_blank"
              rel="noreferrer"
              className="platform-btn"
            >
              View on Zillow →
            </a>
            <a
              href={listing.urls?.apartments
                || `https://www.apartments.com/${(listing.city || '').toLowerCase().replace(/\s+/g, '-')}-ca/`}
              target="_blank"
              rel="noreferrer"
              className="platform-btn"
            >
              Apartments.com →
            </a>
            {listing.listingUrl && (
              <a href={listing.listingUrl} target="_blank" rel="noreferrer" className="platform-btn">
                Original listing →
              </a>
            )}
          </div>
          <p className="muted small" style={{ marginTop: 14, fontSize: 11 }}>
            Coordinates: {listing.lat?.toFixed(4)}°, {listing.lng?.toFixed(4)}°
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

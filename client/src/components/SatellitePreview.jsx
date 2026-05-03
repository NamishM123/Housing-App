const GOOGLE_EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || '';

export default function SatellitePreview({ listing, onClose }) {

  const streetViewUrl = listing?.lat && listing?.lng
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${listing.lat},${listing.lng}`
    : null;

  const streetEmbedUrl = listing?.lat && listing?.lng && GOOGLE_EMBED_KEY
    ? `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_EMBED_KEY}&location=${listing.lat},${listing.lng}&heading=210&pitch=0&fov=90`
    : null;

  if (!listing) return null;
  const hasCoords = !!(listing.lat && listing.lng);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal preview-modal">
        <div className="modal-header">
          <div>
            <h3>🚶 Street View</h3>
            <p className="modal-subtitle">{listing.address}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="preview-map-wrap">
          {/* Street view (Google Maps Embed API iframe) */}
          <div className="preview-view-pane">
            {!hasCoords ? (
              <div className="preview-fallback">No coordinates available for this listing.</div>
            ) : !GOOGLE_EMBED_KEY ? (
              <div className="preview-fallback streetview-setup">
                <div style={{ textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🚶</div>
                  <strong style={{ fontSize: 16 }}>Street View Available</strong>
                  <p className="muted small" style={{ marginTop: 12, lineHeight: 1.5 }}>
                    Click below to view this location in Google Street View
                  </p>
                </div>
                {streetViewUrl && (
                  <a
                    className="preview-streetview-btn static"
                    href={streetViewUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginTop: 24, padding: '12px 24px', fontSize: 14, fontWeight: 700 }}
                  >
                    🚶 Open Google Street View →
                  </a>
                )}
                <p className="muted small" style={{ marginTop: 24, fontSize: 11, color: '#64748b' }}>
                  To embed Street View here, add <code>VITE_GOOGLE_MAPS_EMBED_KEY</code> to your .env file
                </p>
              </div>
            ) : (
              <iframe
                title="Google Street View"
                className="preview-streetview-iframe"
                src={streetEmbedUrl}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        </div>

        <div className="preview-meta">
          <span><strong>${listing.price?.toLocaleString()}/mo</strong></span>
          <span className="stat-sep">·</span>
          <span>{listing.beds} bd · {listing.baths} ba</span>
          {listing.sqft && (<><span className="stat-sep">·</span><span>{listing.sqft.toLocaleString()} sqft</span></>)}
        </div>

        <div className="preview-hint-row">
          <span className="kbd-hint kbd-muted">Drag to look around · click arrows on the road to walk down the street</span>
        </div>
      </div>
    </div>
  );
}

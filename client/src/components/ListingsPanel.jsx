import { useState } from 'react';
import ListingDetailModal from './ListingDetailModal';
import { listingCardChain } from '../utils/listingImages';

const BED_FILTERS = ['All', '1', '2', '3+'];

const KIND_BADGE = {
  photo:       '📷 Listing photo',
  streetview:  '📷 Street View',
  aerial:      '🛰 Aerial',
  placeholder: '',
};

function ListingThumb({ listing, onClick }) {
  const chain = listingCardChain(listing);
  const [step, setStep] = useState(0);
  const current = chain[Math.min(step, chain.length - 1)];
  const badge = KIND_BADGE[current.kind];

  return (
    <button className="listing-thumb-btn" onClick={onClick} title="View full details">
      <img
        src={current.src}
        alt={listing.address}
        className="listing-card-image"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setStep(s => Math.min(s + 1, chain.length - 1))}
      />
      {badge && <span className="listing-card-image-badge">{badge}</span>}
    </button>
  );
}

function buildTourEmail({ listing, form }) {
  const name = form?.jobTitle ? `a ${form.jobTitle}` : 'a prospective tenant';
  const timeline = form?.timeline === 'asap' ? 'as soon as possible' : `within ${form?.timeline}`;
  const pets = form?.hasPet ? 'I have one pet.' : 'I have no pets.';
  const roommates = form?.roommates > 0 ? `I will have ${form.roommates} roommate(s).` : 'I will be living alone.';

  return {
    subject: `Tour Request – ${listing.address}`,
    body: `Hello,\n\nI'm interested in scheduling a tour for the rental at ${listing.address} listed at $${listing.price?.toLocaleString()}/month.\n\nA bit about me:\n- I'm ${name} with stable employment\n- Looking to move in ${timeline}\n- ${roommates}\n- ${pets}\n\nCould you let me know your available times? I'm flexible on weekdays and weekends.\n\nThank you for your time,\n[Your Name]\n[Your Phone]`,
  };
}

function TourModal({ listing, form, onClose }) {
  const [copied, setCopied] = useState(false);
  const { subject, body } = buildTourEmail({ listing, form });
  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Tour Request — {listing.address}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <p className="modal-subtitle">Pre-filled email ready to send. Edit before sending if needed.</p>

        <div className="email-preview">
          <div className="email-subject">
            <span className="email-label">Subject</span>
            <span>{subject}</span>
          </div>
          <div className="email-body">
            <span className="email-label">Body</span>
            <pre>{body}</pre>
          </div>
        </div>

        <div className="modal-actions">
          <a href={mailtoHref} className="action-btn" target="_blank" rel="noreferrer">
            📧 Open in Email Client
          </a>
          <button className="action-btn secondary" onClick={handleCopy}>
            {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
          </button>
        </div>

        <div className="platform-links">
          <p className="muted small">Or find this property on:</p>
          <div className="platform-btns">
            <a href={listing.urls?.zillow || listing.zillowUrl || '#'} target="_blank" rel="noreferrer" className="platform-btn">Zillow</a>
            <a href={listing.urls?.apartments || '#'} target="_blank" rel="noreferrer" className="platform-btn">Apartments.com</a>
            <a href={listing.urls?.craigslist || '#'} target="_blank" rel="noreferrer" className="platform-btn">Craigslist</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListingsPanel({ listings, loading, searchUrls, form, shortlist, onShortlist }) {
  const [bedFilter, setBedFilter] = useState('All');
  const [tourTarget, setTourTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [sortBy, setSortBy] = useState('price');

  if (loading) {
    return (
      <div className="loading-row">
        <div className="spinner sm" />
        <span className="muted">Fetching listings…</span>
      </div>
    );
  }

  if (!listings || !listings.length) {
    return (
      <div className="listings-empty">
        <p className="muted">No listings found for this area.</p>
        <div className="platform-links">
          <p className="muted small">Search directly on:</p>
          <div className="platform-btns">
            {searchUrls?.zillow && <a href={searchUrls.zillow} target="_blank" rel="noreferrer" className="platform-btn">Zillow</a>}
            {searchUrls?.apartments && <a href={searchUrls.apartments} target="_blank" rel="noreferrer" className="platform-btn">Apartments.com</a>}
            {searchUrls?.craigslist && <a href={searchUrls.craigslist} target="_blank" rel="noreferrer" className="platform-btn">Craigslist</a>}
          </div>
        </div>
      </div>
    );
  }

  const filtered = listings
    .filter(l => {
      if (bedFilter === 'All') return true;
      if (bedFilter === '3+') return l.beds >= 3;
      return l.beds === Number(bedFilter);
    })
    .sort((a, b) => sortBy === 'price' ? a.price - b.price : (b.sqft || 0) - (a.sqft || 0));

  const maxRent = form?.maxRent;

  return (
    <>
      <div className="listings-toolbar">
        <div className="bed-filters">
          {BED_FILTERS.map(f => (
            <button key={f} className={`bed-btn ${bedFilter === f ? 'active' : ''}`} onClick={() => setBedFilter(f)}>
              {f === 'All' ? 'All' : `${f} BR`}
            </button>
          ))}
        </div>
        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="price">Sort: Price ↑</option>
          <option value="sqft">Sort: Size ↓</option>
        </select>
      </div>

      <div className="listings-search-links">
        <span className="muted small">Browse all on:</span>
        {searchUrls?.zillow && <a href={searchUrls.zillow} target="_blank" rel="noreferrer" className="text-link">Zillow</a>}
        {searchUrls?.apartments && <a href={searchUrls.apartments} target="_blank" rel="noreferrer" className="text-link">Apartments.com</a>}
        {searchUrls?.craigslist && <a href={searchUrls.craigslist} target="_blank" rel="noreferrer" className="text-link">Craigslist</a>}
      </div>

      <div className="listings-grid">
        {filtered.map(listing => {
          const isShortlisted = shortlist.some(s => s.id === listing.id);
          const overBudget = maxRent && listing.price > maxRent;

          return (
            <div key={listing.id} className={`listing-card ${overBudget ? 'over-budget' : ''} ${isShortlisted ? 'shortlisted' : ''}`}>
              <ListingThumb listing={listing} onClick={() => setDetailTarget(listing)} />

              <div className="listing-header">
                <div>
                  <button
                    className="listing-address listing-address-btn"
                    onClick={() => setDetailTarget(listing)}
                    title="View full details"
                  >
                    {listing.address}
                  </button>
                  <div className="listing-meta">{listing.type} · Available {listing.available}</div>
                </div>
                <button
                  className={`shortlist-btn ${isShortlisted ? 'active' : ''}`}
                  onClick={() => onShortlist(listing)}
                  title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                >
                  {isShortlisted ? '★' : '☆'}
                </button>
              </div>

              <div className="listing-price-row">
                <span className="listing-price" style={{ color: overBudget ? 'var(--red)' : 'var(--green)' }}>
                  ${listing.price?.toLocaleString()}/mo
                </span>
                {overBudget && <span className="over-budget-badge">Over budget</span>}
              </div>

              <div className="listing-stats">
                <span>{listing.beds} bd</span>
                <span className="stat-sep">·</span>
                <span>{listing.baths} ba</span>
                {listing.sqft && <><span className="stat-sep">·</span><span>{listing.sqft?.toLocaleString()} sqft</span></>}
                {listing.petFriendly && <><span className="stat-sep">·</span><span className="pet-tag">🐾 Pets OK</span></>}
              </div>

              {listing.features?.length > 0 && (
                <div className="listing-features">
                  {listing.features.map(f => <span key={f} className="feature-tag">{f}</span>)}
                </div>
              )}

              <div className="listing-actions">
                <button className="listing-action-btn primary" onClick={() => setDetailTarget(listing)}>
                  🏠 View Details
                </button>
                <button className="listing-action-btn" onClick={() => setTourTarget(listing)}>
                  📅 Request Tour
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {tourTarget && (
        <TourModal listing={tourTarget} form={form} onClose={() => setTourTarget(null)} />
      )}

      {detailTarget && (
        <ListingDetailModal
          listing={detailTarget}
          form={form}
          isShortlisted={shortlist.some(s => s.id === detailTarget.id)}
          onShortlist={onShortlist}
          onRequestTour={(l) => { setDetailTarget(null); setTourTarget(l); }}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </>
  );
}

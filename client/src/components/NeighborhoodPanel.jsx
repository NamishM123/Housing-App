import { useState, useEffect } from 'react';
import { fetchNeighborhoodReviews } from '../utils/api';
import ListingsPanel from './ListingsPanel';

const UTILITIES = { pge: 95, water: 45, internet: 70 };
const TOTAL_UTILITIES = Object.values(UTILITIES).reduce((a, b) => a + b, 0);

export default function NeighborhoodPanel({ open, activeTab, neighborhood, form, onClose, listings, listingsLoading, searchUrls, shortlist, onShortlist, onEditProfile }) {
  const [reviews, setReviews]                 = useState(null);
  const [reviewsLoading, setReviewsLoading]   = useState(false);
  const [reviewsError, setReviewsError]       = useState(null);

  useEffect(() => { setReviews(null); setReviewsError(null); }, [neighborhood?.id]);

  // Fetch real-people reviews from Reddit when the user opens Insights.
  // Lazy-load on tab open so we don't burn the rate-limit on every map click.
  useEffect(() => {
    if (activeTab !== 'insights' || !neighborhood) return;
    if (reviews || reviewsLoading) return;
    setReviewsLoading(true);
    setReviewsError(null);
    fetchNeighborhoodReviews(neighborhood.name)
      .then((data) => {
        setReviews(data?.reviews || []);
        if (data?.error) setReviewsError(data.error);
      })
      .catch(() => setReviewsError('unavailable'))
      .finally(() => setReviewsLoading(false));
  }, [activeTab, neighborhood?.id]);

  if (!neighborhood) return null;

  const deposit      = neighborhood.avgRent * 1.5;
  const firstMonth   = neighborhood.avgRent;
  const totalMoveIn  = firstMonth + deposit + TOTAL_UTILITIES + 300;

  return (
    <div className="n-panel">
      {/* ── Header ── */}
      <div className="n-panel-header">
        <div className="n-panel-header-left">
          <div className="n-panel-neighborhood">{neighborhood.name}</div>
        </div>
        <button className="n-panel-close-btn" onClick={onClose} aria-label="Close panel">✕</button>
      </div>

      {/* ── Body ── */}
      <div className="n-panel-body">

        {/* Listings */}
        {activeTab === 'listings' && (
          <ListingsPanel listings={listings} loading={listingsLoading} searchUrls={searchUrls}
            form={form} shortlist={shortlist} onShortlist={onShortlist} onEditProfile={onEditProfile} />
        )}

        {/* Costs */}
        {activeTab === 'costs' && (
          <div className="costs-tab">
            <div className="cost-section">
              <h3>Move-In Costs</h3>
              {[
                ['First Month Rent',          `$${firstMonth.toLocaleString()}`],
                ['Security Deposit (1.5×)',   `$${Math.round(deposit).toLocaleString()}`],
                ['PG&E (first month)',         `$${UTILITIES.pge}`],
                ['Water / Sewer',             `$${UTILITIES.water}`],
                ['Internet Setup',            `$${UTILITIES.internet}`],
                ['Moving Supplies',           '$300'],
              ].map(([label, val]) => (
                <div key={label} className="cost-row"><span>{label}</span><span>{val}</span></div>
              ))}
              <div className="cost-row total">
                <span>Total Move-In Cost</span>
                <span>${Math.round(totalMoveIn).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        {activeTab === 'insights' && (
          <div className="insights-tab">
            <NoiseScoreRow score={neighborhood.noiseScore} level={neighborhood.noiseLevel} sources={neighborhood.noiseSources} />
            <InsightRow icon="🅿️"  label="Parking"     value={neighborhood.parkingDifficulty} badge={neighborhood.parkingDifficulty} />

            {/* Real-people reviews scraped from Reddit */}
            <div className="insight-section">
              <div className="insight-section-title">💬 What people are saying</div>
              <ReviewsBlock
                loading={reviewsLoading}
                error={reviewsError}
                reviews={reviews}
                neighborhoodName={neighborhood.name}
              />
            </div>

            {neighborhood.localInsights?.length > 0 && (
              <div className="insight-section">
                <div className="insight-section-title">Local Knowledge</div>
                <ul className="insight-list">
                  {neighborhood.localInsights.map((tip, i) => (
                    <li key={i} className="insight-item">
                      <span className="insight-bullet">→</span><span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {neighborhood.recentNews?.length > 0 && (
              <div className="insight-section">
                <div className="insight-section-title">📰 Local News</div>
                <div className="news-feed">
                  {neighborhood.recentNews.map((item, i) => (
                    <div key={i} className="news-card">
                      <div className="news-card-top">
                        <span className={`news-category news-cat-${item.category.toLowerCase()}`}>{item.category}</span>
                        <span className="news-date">{item.date}</span>
                      </div>
                      <p className="news-headline">{item.headline}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!neighborhood.noiseLevel && <p className="muted">No local insights available yet.</p>}
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Helpers ── */
function InsightRow({ icon, label, value, badge, detail }) {
  const badgeClass = { quiet: 'badge-green', moderate: 'badge-amber', loud: 'badge-red', easy: 'badge-green', hard: 'badge-red' }[badge] || 'badge-muted';
  return (
    <div className="insight-row">
      <div className="insight-row-header">
        <span className="insight-icon">{icon}</span>
        <span className="insight-label">{label}</span>
        <span className={`insight-badge ${badgeClass}`}>{value}</span>
      </div>
      {detail?.length > 0 && <ul className="insight-sources">{detail.map((d, i) => <li key={i}>{d}</li>)}</ul>}
    </div>
  );
}

function NoiseScoreRow({ score, level, sources }) {
  if (score == null && !level) return null;
  const safeScore = score ?? (level === 'loud' ? 75 : level === 'moderate' ? 50 : 25);
  const tone =
    safeScore >= 65 ? { label: 'Loud',     bar: '#ef4444', badge: 'badge-red'   } :
    safeScore >= 40 ? { label: 'Moderate', bar: '#f59e0b', badge: 'badge-amber' } :
                      { label: 'Quiet',    bar: '#22c55e', badge: 'badge-green' };

  return (
    <div className="insight-row noise-row">
      <div className="insight-row-header">
        <span className="insight-icon">🔊</span>
        <span className="insight-label">Noise Score</span>
        <span className={`insight-badge ${tone.badge}`}>{tone.label}</span>
      </div>
      <div className="noise-meter">
        <div className="noise-meter-track">
          <div className="noise-meter-fill" style={{ width: `${safeScore}%`, background: tone.bar }} />
        </div>
        <span className="noise-meter-value">{safeScore} / 100</span>
      </div>
      {sources?.length > 0 && <ul className="insight-sources">{sources.map((s, i) => <li key={i}>{s}</li>)}</ul>}
    </div>
  );
}

function timeAgo(unixSec) {
  if (!unixSec) return '';
  const diffMs = Date.now() - unixSec * 1000;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function ReviewsBlock({ loading, error, reviews, neighborhoodName }) {
  if (loading) {
    return (
      <div className="loading-row">
        <div className="spinner sm" />
        <span className="muted">Pulling real-people discussions about {neighborhoodName}…</span>
      </div>
    );
  }
  if (error === 'rate_limited') {
    return <p className="muted small">Reddit rate-limited us. Try again in a few minutes.</p>;
  }
  if (error) {
    return <p className="muted small">Couldn't load community discussions right now.</p>;
  }
  if (!reviews || reviews.length === 0) {
    return <p className="muted small">No recent Reddit discussions found about {neighborhoodName}.</p>;
  }
  return (
    <div className="reviews-feed">
      {reviews.map((r) => (
        <a key={r.id} className="review-card" href={r.url} target="_blank" rel="noreferrer">
          <div className="review-head">
            <span className="review-sub">{r.subreddit}</span>
            <span className="review-author">{r.author}</span>
            <span className="review-meta">↑ {r.score} · 💬 {r.numComments} · {timeAgo(r.createdUtc)}</span>
          </div>
          <p className="review-title">{r.title}</p>
          {r.snippet !== r.title && <p className="review-snippet">{r.snippet}</p>}
        </a>
      ))}
      <p className="muted small reviews-footnote">Live from Reddit · cached 1h · click any card to open the full thread</p>
    </div>
  );
}


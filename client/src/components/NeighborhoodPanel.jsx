import { useState, useEffect } from 'react';
import { fetchWalkScore, fetchChecklist, fetchFurnitureList, fetchNeighborhoodReviews } from '../utils/api';
import RoomLayout from './RoomLayout';
import MoveInChecklist from './MoveInChecklist';
import ListingsPanel from './ListingsPanel';

const UTILITIES = { pge: 95, water: 45, internet: 70 };
const TOTAL_UTILITIES = Object.values(UTILITIES).reduce((a, b) => a + b, 0);

const SECTION_META = {
  listings:  { icon: '🏠', label: 'Listings' },
  costs:     { icon: '💰', label: 'Move-in Costs' },
  walkscore: { icon: '🚶', label: 'Walkability' },
  insights:  { icon: '📍', label: 'Area Insights' },
  layout:    { icon: '🛋️', label: 'Room Layout' },
  checklist: { icon: '✅', label: 'Move-in Checklist' },
};

export default function NeighborhoodPanel({ open, activeTab, neighborhood, form, onClose, listings, listingsLoading, searchUrls, shortlist, onShortlist, onEditProfile }) {
  const [walkScore, setWalkScore]         = useState(null);
  const [checklist, setChecklist]         = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [furniture, setFurniture]         = useState(null);
  const [furnitureLoading, setFurnitureLoading] = useState(false);
  const [roomDims, setRoomDims]           = useState({ width: 12, length: 14 });
  const [furnitureBudget, setFurnitureBudget] = useState('');
  const [reviews, setReviews]                 = useState(null);
  const [reviewsLoading, setReviewsLoading]   = useState(false);
  const [reviewsError, setReviewsError]       = useState(null);

  useEffect(() => {
    if (!neighborhood) return;
    setWalkScore(null);
    fetchWalkScore(neighborhood.id)
      .then(setWalkScore)
      .catch(() => setWalkScore({ walk: neighborhood.walkScore, transit: 25, bike: 40, source: 'fallback' }));
  }, [neighborhood?.id]);

  useEffect(() => { setChecklist(null); setFurniture(null); setReviews(null); setReviewsError(null); }, [neighborhood?.id]);

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

  const handleGenerateChecklist = () => {
    if (!form || !neighborhood) return;
    setChecklistLoading(true);
    fetchChecklist({ ...form, neighborhood: neighborhood.name })
      .then(setChecklist)
      .catch(() => setChecklist({
        categories: [
          { name: 'Admin / Paperwork', items: ['Update driver\'s license address', 'Forward mail via USPS', 'Register to vote at new address'] },
          { name: 'Utilities Setup',   items: ['Set up PG&E account', 'Set up water/sewer', 'Set up internet (Charter/Spectrum)'] },
          { name: 'Home Essentials',   items: ['Buy cleaning supplies', 'Set up kitchen basics', 'Get first aid kit', 'Buy bedding/towels'] },
          ...(form?.hasCar ? [{ name: 'Transport', items: ['Get SLO city parking permit', 'Update CA car registration'] }]
                           : [{ name: 'Transport', items: ['Download SLO Transit app', 'Get bike lock + helmet'] }]),
          { name: 'Social / Fun',      items: ['Thursday Farmers Market downtown', 'Find local hiking trails', 'Join SLO subreddit & Facebook groups'] },
        ],
      }))
      .finally(() => setChecklistLoading(false));
  };

  const handleGenerateFurniture = () => {
    if (!furnitureBudget) return;
    setFurnitureLoading(true);
    fetchFurnitureList({ budget: Number(furnitureBudget), roomWidth: roomDims.width, roomLength: roomDims.length })
      .then(setFurniture)
      .catch(() => setFurniture({
        items: [
          { name: 'Bed Frame + Mattress', estimatedCost: 400, priority: 'essential', reason: 'Sleep is non-negotiable.' },
          { name: 'Desk + Chair',         estimatedCost: 150, priority: 'essential', reason: 'Work from home needs.' },
          { name: 'Dresser',              estimatedCost: 100, priority: 'essential', reason: 'Keeps clothes organized.' },
          { name: 'Bookshelf',            estimatedCost: 60,  priority: 'recommended', reason: 'Storage + decor.' },
          { name: 'Floor Lamp',           estimatedCost: 40,  priority: 'recommended', reason: 'Ambient lighting.' },
          { name: 'Rug',                  estimatedCost: 80,  priority: 'nice-to-have', reason: 'Warms up the space.' },
        ],
        totalEstimate: 830,
        summary: 'Bed + desk first — everything else can wait.',
      }))
      .finally(() => setFurnitureLoading(false));
  };

  if (!neighborhood) return null;

  const deposit      = neighborhood.avgRent * 1.5;
  const firstMonth   = neighborhood.avgRent;
  const totalMoveIn  = firstMonth + deposit + TOTAL_UTILITIES + 300;
  const savingsAfter = form ? form.savings - totalMoveIn : 0;
  const savingsPct   = form ? Math.min(100, Math.round((totalMoveIn / form.savings) * 100)) : 0;
  const meta         = SECTION_META[activeTab] || {};

  return (
    <div className="n-panel">
      {/* ── Header ── */}
      <div className="n-panel-header">
        <div className="n-panel-header-left">
          <span className="n-panel-hdr-icon">{meta.icon}</span>
          <div>
            <div className="n-panel-section-label">{meta.label}</div>
            <div className="n-panel-neighborhood">{neighborhood.name}</div>
          </div>
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
            {form && (
              <div className="savings-bar-section">
                <div className="savings-bar-header">
                  <span>Move-in cost vs savings</span>
                  <span style={{ color: savingsAfter < 0 ? '#ef4444' : '#22c55e' }}>
                    {savingsAfter < 0
                      ? `$${Math.abs(Math.round(savingsAfter)).toLocaleString()} short`
                      : `$${Math.round(savingsAfter).toLocaleString()} remaining`}
                  </span>
                </div>
                <div className="savings-bar">
                  <div className="savings-bar-fill" style={{
                    width: `${Math.min(savingsPct, 100)}%`,
                    background: savingsPct > 100 ? '#ef4444' : savingsPct > 75 ? '#f59e0b' : '#22c55e',
                  }} />
                </div>
                <div className="savings-bar-labels">
                  <span>$0</span><span>{savingsPct}% of savings used</span><span>${form.savings.toLocaleString()}</span>
                </div>
              </div>
            )}
            <div className="furniture-budget-section">
              <h3>Furniture Budget Calculator</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Budget ($)</label>
                  <input type="number" min="0" placeholder={savingsAfter > 0 ? String(Math.round(savingsAfter * 0.5)) : '1000'}
                    value={furnitureBudget} onChange={e => setFurnitureBudget(e.target.value)} />
                </div>
              </div>
              <button className="action-btn" onClick={handleGenerateFurniture} disabled={!furnitureBudget || furnitureLoading}>
                {furnitureLoading ? <><span className="spinner xs" /> Generating…</> : '✨ Generate Shopping List'}
              </button>
              {furniture && (
                <div className="furniture-list">
                  <p className="furniture-summary">{furniture.summary}</p>
                  {furniture.items.map((item, i) => (
                    <div key={i} className="furniture-item">
                      <div className="furniture-item-header">
                        <span className="furniture-name">{item.name}</span>
                        <span className="furniture-cost">${item.estimatedCost}</span>
                      </div>
                      <div className="furniture-meta">
                        <span className={`priority-badge ${item.priority}`}>{item.priority}</span>
                        <span className="furniture-reason">{item.reason}</span>
                      </div>
                    </div>
                  ))}
                  <div className="furniture-total">Estimated total: <strong>${furniture.totalEstimate.toLocaleString()}</strong></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Walkability */}
        {activeTab === 'walkscore' && (
          <div className="walkscore-tab">
            {walkScore ? (
              <>
                <div className="score-cards">
                  <ScoreCard label="Walk Score"    value={walkScore.walk}    icon="🚶" />
                  <ScoreCard label="Transit Score"  value={walkScore.transit} icon="🚌" />
                  <ScoreCard label="Bike Score"     value={walkScore.bike}    icon="🚲" />
                </div>
                {walkScore.source === 'fallback' && <p className="muted small">Estimated — add WALKSCORE_API_KEY for live data.</p>}
                <WalkDescription score={walkScore.walk} neighborhood={neighborhood.name} />
              </>
            ) : (
              <div className="loading-row"><div className="spinner sm" /><span>Loading scores…</span></div>
            )}
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

        {/* Room Layout */}
        {activeTab === 'layout' && (
          <div className="layout-tab">
            <div className="room-dims-form">
              <h3>Room Dimensions</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Width (ft)</label>
                  <input type="number" min="6" max="40" value={roomDims.width}
                    onChange={e => setRoomDims(d => ({ ...d, width: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Length (ft)</label>
                  <input type="number" min="6" max="50" value={roomDims.length}
                    onChange={e => setRoomDims(d => ({ ...d, length: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <RoomLayout width={roomDims.width} length={roomDims.length} />
          </div>
        )}

        {/* Checklist */}
        {activeTab === 'checklist' && (
          <MoveInChecklist checklist={checklist} loading={checklistLoading}
            onGenerate={handleGenerateChecklist} hasForm={!!form} />
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function ScoreCard({ label, value, icon }) {
  const color = value >= 70 ? '#22c55e' : value >= 50 ? '#14b8a6' : value >= 25 ? '#f59e0b' : '#ef4444';
  return (
    <div className="score-card">
      <span className="score-icon">{icon}</span>
      <div className="score-ring" style={{ borderColor: color }}><span style={{ color }}>{value}</span></div>
      <span className="score-card-label">{label}</span>
    </div>
  );
}

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

function WalkDescription({ score, neighborhood }) {
  let desc;
  if      (score >= 90) desc = `${neighborhood} is a walker's paradise — daily errands need no car.`;
  else if (score >= 70) desc = `${neighborhood} is very walkable. Most errands can be done on foot.`;
  else if (score >= 50) desc = `${neighborhood} is somewhat walkable. Some errands on foot.`;
  else if (score >= 25) desc = `${neighborhood} is car-dependent for most errands.`;
  else                  desc = `${neighborhood} is almost entirely car-dependent. A vehicle is strongly recommended.`;
  return <p className="walk-description">{desc}</p>;
}

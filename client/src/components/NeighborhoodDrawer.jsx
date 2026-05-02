import { useState, useEffect } from 'react';
import { fetchWalkScore, fetchChecklist, fetchFurnitureList } from '../utils/api';
import RoomLayout from './RoomLayout';
import MoveInChecklist from './MoveInChecklist';
import ListingsPanel from './ListingsPanel';

const UTILITIES = { pge: 95, water: 45, internet: 70 };
const TOTAL_UTILITIES = Object.values(UTILITIES).reduce((a, b) => a + b, 0);

const TABS = [
  { id: 'listings',  label: '🏠 Listings' },
  { id: 'costs',     label: '💰 Costs' },
  { id: 'walkscore', label: '🚶 Walkability' },
  { id: 'layout',    label: '🛋️ Room' },
  { id: 'checklist', label: '✅ Checklist' },
];

export default function NeighborhoodDrawer({ open, neighborhood, form, onClose, listings, listingsLoading, searchUrls, shortlist, onShortlist }) {
  const [walkScore, setWalkScore] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [furniture, setFurniture] = useState(null);
  const [furnitureLoading, setFurnitureLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('listings');
  const [roomDims, setRoomDims] = useState({ width: 12, length: 14 });
  const [furnitureBudget, setFurnitureBudget] = useState('');

  const deposit    = neighborhood ? neighborhood.avgRent * 1.5 : 0;
  const firstMonth = neighborhood ? neighborhood.avgRent : 0;
  const totalMoveIn = firstMonth + deposit + TOTAL_UTILITIES + 300;
  const savingsAfter = form ? form.savings - totalMoveIn : 0;
  const savingsPct   = form ? Math.min(100, Math.round((totalMoveIn / form.savings) * 100)) : 0;

  // Reset tabs and walk score when neighborhood changes
  useEffect(() => {
    if (!neighborhood) return;
    setActiveTab('listings');
    setWalkScore(null);
    fetchWalkScore(neighborhood.id)
      .then(setWalkScore)
      .catch(() => setWalkScore({ walk: neighborhood.walkScore, transit: 25, bike: 40, source: 'fallback' }));
  }, [neighborhood?.id]);

  const handleGenerateChecklist = () => {
    if (!form || !neighborhood) return;
    setChecklistLoading(true);
    fetchChecklist({ ...form, neighborhood: neighborhood.name })
      .then(setChecklist)
      .catch(() => setChecklist({
        categories: [
          { name: 'Admin / Paperwork', items: ['Update driver\'s license address', 'Forward mail via USPS', 'Register to vote at new address', 'Notify employer / HR of address change'] },
          { name: 'Utilities Setup', items: ['Set up PG&E account', 'Set up water/sewer', 'Set up internet (Charter/Spectrum)'] },
          { name: 'Home Essentials', items: ['Buy cleaning supplies', 'Set up kitchen basics', 'Get first aid kit', 'Buy bedding/towels'] },
          ...(form?.hasCar ? [{ name: 'Transport', items: ['Get SLO city parking permit', 'Update CA car registration', 'Find nearest gas stations'] }] : [{ name: 'Transport', items: ['Download SLO Transit app', 'Get bike lock + helmet', 'Map grocery route on foot'] }]),
          { name: 'Social / Fun', items: ['Thursday Farmers Market downtown', 'Find local hiking trails', 'Join SLO subreddit & Facebook groups'] },
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
          { name: 'Desk + Chair', estimatedCost: 150, priority: 'essential', reason: 'Work from home needs.' },
          { name: 'Dresser', estimatedCost: 100, priority: 'essential', reason: 'Keeps clothes organized.' },
          { name: 'Bookshelf', estimatedCost: 60, priority: 'recommended', reason: 'Storage + decor.' },
          { name: 'Floor Lamp', estimatedCost: 40, priority: 'recommended', reason: 'Ambient lighting.' },
          { name: 'Rug', estimatedCost: 80, priority: 'nice-to-have', reason: 'Warms up the space.' },
        ],
        totalEstimate: 830,
        summary: 'Bed + desk first — everything else can wait.',
      }))
      .finally(() => setFurnitureLoading(false));
  };

  if (!neighborhood) return null;

  return (
    <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <div>
            <h2>{neighborhood.name}</h2>
            <span className="drawer-subtitle">
              Avg rent ${neighborhood.avgRent.toLocaleString()}/mo
              {listings?.length ? ` · ${listings.length} listings` : ''}
              {shortlist.length > 0 ? ` · ★ ${shortlist.length} shortlisted` : ''}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="drawer-body">

          {/* ── Listings ──────────────────────────────── */}
          {activeTab === 'listings' && (
            <ListingsPanel
              listings={listings}
              loading={listingsLoading}
              searchUrls={searchUrls}
              form={form}
              shortlist={shortlist}
              onShortlist={onShortlist}
            />
          )}

          {/* ── Costs ─────────────────────────────────── */}
          {activeTab === 'costs' && (
            <div className="costs-tab">
              <div className="cost-section">
                <h3>Move-In Costs</h3>
                {[
                  ['First Month Rent', `$${firstMonth.toLocaleString()}`],
                  ['Security Deposit (1.5×)', `$${Math.round(deposit).toLocaleString()}`],
                  ['PG&E (first month)', `$${UTILITIES.pge}`],
                  ['Water/Sewer', `$${UTILITIES.water}`],
                  ['Internet Setup', `$${UTILITIES.internet}`],
                  ['Moving Supplies', '$300'],
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
                      {savingsAfter < 0 ? `$${Math.abs(Math.round(savingsAfter)).toLocaleString()} short` : `$${Math.round(savingsAfter).toLocaleString()} remaining`}
                    </span>
                  </div>
                  <div className="savings-bar">
                    <div className="savings-bar-fill" style={{ width: `${Math.min(savingsPct, 100)}%`, background: savingsPct > 100 ? '#ef4444' : savingsPct > 75 ? '#f59e0b' : '#22c55e' }} />
                  </div>
                  <div className="savings-bar-labels">
                    <span>$0</span>
                    <span>{savingsPct}% of savings used</span>
                    <span>${form.savings.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="furniture-budget-section">
                <h3>Furniture Budget Calculator</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Budget ($)</label>
                    <input type="number" min="0" placeholder={savingsAfter > 0 ? String(Math.round(savingsAfter * 0.5)) : '1000'} value={furnitureBudget} onChange={e => setFurnitureBudget(e.target.value)} />
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

          {/* ── Walkability ────────────────────────────── */}
          {activeTab === 'walkscore' && (
            <div className="walkscore-tab">
              {walkScore ? (
                <>
                  <div className="score-cards">
                    <ScoreCard label="Walk Score" value={walkScore.walk} icon="🚶" />
                    <ScoreCard label="Transit Score" value={walkScore.transit} icon="🚌" />
                    <ScoreCard label="Bike Score" value={walkScore.bike} icon="🚲" />
                  </div>
                  {walkScore.source === 'fallback' && <p className="muted small">Estimated scores — add WALKSCORE_API_KEY for live data.</p>}
                  <WalkDescription score={walkScore.walk} neighborhood={neighborhood.name} />
                </>
              ) : (
                <div className="loading-row"><div className="spinner sm" /><span>Loading scores…</span></div>
              )}
            </div>
          )}

          {/* ── Room Layout ────────────────────────────── */}
          {activeTab === 'layout' && (
            <div className="layout-tab">
              <div className="room-dims-form">
                <h3>Room Dimensions</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Width (ft)</label>
                    <input type="number" min="6" max="40" value={roomDims.width} onChange={e => setRoomDims(d => ({ ...d, width: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label>Length (ft)</label>
                    <input type="number" min="6" max="50" value={roomDims.length} onChange={e => setRoomDims(d => ({ ...d, length: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
              <RoomLayout width={roomDims.width} length={roomDims.length} />
            </div>
          )}

          {/* ── Checklist ─────────────────────────────── */}
          {activeTab === 'checklist' && (
            <MoveInChecklist checklist={checklist} loading={checklistLoading} onGenerate={handleGenerateChecklist} hasForm={!!form} />
          )}
        </div>
      </div>
    </div>
  );
}

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

function WalkDescription({ score, neighborhood }) {
  let desc;
  if (score >= 90) desc = `${neighborhood} is a walker's paradise — daily errands need no car.`;
  else if (score >= 70) desc = `${neighborhood} is very walkable. Most errands can be done on foot.`;
  else if (score >= 50) desc = `${neighborhood} is somewhat walkable. Some errands on foot.`;
  else if (score >= 25) desc = `${neighborhood} is car-dependent for most errands.`;
  else desc = `${neighborhood} is almost entirely car-dependent. A vehicle is strongly recommended.`;
  return <p className="walk-description">{desc}</p>;
}

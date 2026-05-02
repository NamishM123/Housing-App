import { useState, useEffect } from 'react';
import { fetchWalkScore, fetchChecklist, fetchFurnitureList } from '../utils/api';
import RoomLayout from './RoomLayout';
import MoveInChecklist from './MoveInChecklist';

const UTILITIES = { pge: 95, water: 45, internet: 70 };
const TOTAL_UTILITIES = Object.values(UTILITIES).reduce((a, b) => a + b, 0);

export default function NeighborhoodDrawer({ open, neighborhood, form, onClose }) {
  const [walkScore, setWalkScore] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [furniture, setFurniture] = useState(null);
  const [furnitureLoading, setFurnitureLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('costs');
  const [roomDims, setRoomDims] = useState({ width: 12, length: 14 });
  const [furnitureBudget, setFurnitureBudget] = useState('');

  const deposit = neighborhood ? neighborhood.avgRent * 1.5 : 0;
  const firstMonth = neighborhood ? neighborhood.avgRent : 0;
  const totalMoveIn = firstMonth + deposit + TOTAL_UTILITIES + 300;
  const savingsAfter = form ? form.savings - totalMoveIn : 0;
  const savingsPct = form ? Math.min(100, Math.round((totalMoveIn / form.savings) * 100)) : 0;

  useEffect(() => {
    if (!neighborhood) return;
    fetchWalkScore(neighborhood.id)
      .then(setWalkScore)
      .catch(() => setWalkScore({ walk: neighborhood.walkScore, transit: 25, bike: 40, source: 'fallback' }));
  }, [neighborhood]);

  const handleGenerateChecklist = () => {
    if (!form || !neighborhood) return;
    setChecklistLoading(true);
    fetchChecklist({ ...form, neighborhood: neighborhood.name })
      .then(setChecklist)
      .catch(() => setChecklist({
        categories: [
          { name: 'Admin / Paperwork', items: ['Update driver\'s license address', 'Forward mail (USPS)', 'Register to vote', 'Notify employer of address change'] },
          { name: 'Utilities Setup', items: ['Set up PG&E account', 'Set up water/sewer', 'Set up internet (Charter/Spectrum)'] },
          { name: 'Home Essentials', items: ['Buy cleaning supplies', 'Set up kitchen basics', 'Get first aid kit', 'Buy bedding/towels'] },
          ...(form?.hasCar ? [{ name: 'Transport', items: ['Get SLO city parking permit', 'Update car registration to CA', 'Find nearest gas stations'] }] : [{ name: 'Transport', items: ['Download SLO Transit app', 'Get bike lock + helmet', 'Map nearest grocery store walking route'] }]),
          { name: 'Social / Fun', items: ['Explore Downtown SLO Thursday Farmers Market', 'Find local climbing gym / outdoor spots', 'Join SLO subreddit or Facebook groups'] },
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
          { name: 'Floor Lamp', estimatedCost: 40, priority: 'recommended', reason: 'Ambient lighting matters.' },
          { name: 'Rug', estimatedCost: 80, priority: 'nice-to-have', reason: 'Warms up the space.' },
        ],
        totalEstimate: 830,
        summary: 'Focus on bed + desk first — everything else can wait.',
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
            <span className="drawer-subtitle">Avg Rent: ${neighborhood.avgRent.toLocaleString()}/mo</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-tabs">
          {['costs', 'walkscore', 'layout', 'checklist'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'costs' && '💰 Costs'}
              {tab === 'walkscore' && '🚶 Walkability'}
              {tab === 'layout' && '🛋️ Room Layout'}
              {tab === 'checklist' && '✅ Checklist'}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {activeTab === 'costs' && (
            <div className="costs-tab">
              <div className="cost-section">
                <h3>Move-In Costs</h3>
                <div className="cost-row">
                  <span>First Month Rent</span>
                  <span>${firstMonth.toLocaleString()}</span>
                </div>
                <div className="cost-row">
                  <span>Security Deposit (1.5×)</span>
                  <span>${Math.round(deposit).toLocaleString()}</span>
                </div>
                <div className="cost-row">
                  <span>PG&E (first month)</span>
                  <span>${UTILITIES.pge}</span>
                </div>
                <div className="cost-row">
                  <span>Water/Sewer</span>
                  <span>${UTILITIES.water}</span>
                </div>
                <div className="cost-row">
                  <span>Internet Setup</span>
                  <span>${UTILITIES.internet}</span>
                </div>
                <div className="cost-row">
                  <span>Moving Supplies</span>
                  <span>$300</span>
                </div>
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
                    <div
                      className="savings-bar-fill"
                      style={{
                        width: `${Math.min(savingsPct, 100)}%`,
                        background: savingsPct > 100 ? '#ef4444' : savingsPct > 75 ? '#f59e0b' : '#22c55e',
                      }}
                    />
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
                    <label>Budget Remaining ($)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder={savingsAfter > 0 ? String(Math.round(savingsAfter * 0.5)) : '1000'}
                      value={furnitureBudget}
                      onChange={e => setFurnitureBudget(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className="action-btn"
                  onClick={handleGenerateFurniture}
                  disabled={!furnitureBudget || furnitureLoading}
                >
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
                    <div className="furniture-total">
                      Estimated total: <strong>${furniture.totalEstimate.toLocaleString()}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'walkscore' && (
            <div className="walkscore-tab">
              {walkScore ? (
                <>
                  <div className="score-cards">
                    <ScoreCard label="Walk Score" value={walkScore.walk} icon="🚶" />
                    <ScoreCard label="Transit Score" value={walkScore.transit} icon="🚌" />
                    <ScoreCard label="Bike Score" value={walkScore.bike} icon="🚲" />
                  </div>
                  {walkScore.source === 'fallback' && (
                    <p className="muted small">Using estimated scores. Add WALKSCORE_API_KEY for live data.</p>
                  )}
                  <WalkDescription score={walkScore.walk} neighborhood={neighborhood.name} />
                </>
              ) : (
                <div className="loading-row"><div className="spinner sm" /><span>Loading scores…</span></div>
              )}
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="layout-tab">
              <div className="room-dims-form">
                <h3>Room Dimensions</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Width (ft)</label>
                    <input
                      type="number" min="6" max="40"
                      value={roomDims.width}
                      onChange={e => setRoomDims(d => ({ ...d, width: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Length (ft)</label>
                    <input
                      type="number" min="6" max="50"
                      value={roomDims.length}
                      onChange={e => setRoomDims(d => ({ ...d, length: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
              <RoomLayout width={roomDims.width} length={roomDims.length} />
            </div>
          )}

          {activeTab === 'checklist' && (
            <MoveInChecklist
              checklist={checklist}
              loading={checklistLoading}
              onGenerate={handleGenerateChecklist}
              hasForm={!!form}
            />
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
      <div className="score-ring" style={{ borderColor: color }}>
        <span style={{ color }}>{value}</span>
      </div>
      <span className="score-card-label">{label}</span>
    </div>
  );
}

function WalkDescription({ score, neighborhood }) {
  let desc;
  if (score >= 90) desc = `${neighborhood} is a walker's paradise — daily errands don't require a car.`;
  else if (score >= 70) desc = `${neighborhood} is very walkable. Most errands can be done on foot.`;
  else if (score >= 50) desc = `${neighborhood} is somewhat walkable. Some errands can be done on foot.`;
  else if (score >= 25) desc = `${neighborhood} is car-dependent for most errands.`;
  else desc = `${neighborhood} is almost entirely car-dependent. A vehicle is strongly recommended.`;

  return <p className="walk-description">{desc}</p>;
}

const TILES = [
  { id: 'listings',  icon: '🏠', label: 'Listings' },
  { id: 'costs',     icon: '💰', label: 'Costs' },
  { id: 'walkscore', icon: '🚶', label: 'Walk' },
  { id: 'insights',  icon: '📍', label: 'Insights' },
  { id: 'layout',    icon: '🛋️', label: 'Room' },
  { id: 'checklist', icon: '✅', label: 'Checklist' },
];

const NOISE_CLASS  = { quiet: 'badge-green', moderate: 'badge-amber', loud: 'badge-red' };
const PARK_CLASS   = { easy: 'badge-green',  moderate: 'badge-amber', hard: 'badge-red' };

export default function NeighborhoodDrawer({ open, neighborhood, onClose, onTileClick, activeTile }) {
  if (!open || !neighborhood) return null;

  const noiseCls   = NOISE_CLASS[neighborhood.noiseLevel]       || 'badge-muted';
  const parkingCls = PARK_CLASS[neighborhood.parkingDifficulty] || 'badge-muted';

  return (
    <div className="nbr-bar">
      {/* Name + quick stats */}
      <div className="nbr-header">
        <div className="nbr-info">
          <h2 className="nbr-name">{neighborhood.name}</h2>
          <div className="nbr-quick-stats">
            <span className="nbr-stat">${neighborhood.avgRent.toLocaleString()}<span className="nbr-stat-unit">/mo avg</span></span>
            <span className="nbr-sep">·</span>
            <span className="nbr-stat">Walk {neighborhood.walkScore}</span>
            {neighborhood.noiseLevel && (
              <>
                <span className="nbr-sep">·</span>
                <span className={`nbr-quick-badge ${noiseCls}`}>{neighborhood.noiseLevel} noise</span>
              </>
            )}
            {neighborhood.parkingDifficulty && (
              <>
                <span className="nbr-sep">·</span>
                <span className={`nbr-quick-badge ${parkingCls}`}>{neighborhood.parkingDifficulty} parking</span>
              </>
            )}
          </div>
        </div>
        <button className="nbr-close-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* Tile row */}
      <div className="nbr-tiles">
        {TILES.map(tile => (
          <button
            key={tile.id}
            className={`nbr-tile ${activeTile === tile.id ? 'active' : ''}`}
            onClick={() => onTileClick(tile.id)}
          >
            <span className="nbr-tile-icon">{tile.icon}</span>
            <span className="nbr-tile-label">{tile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';

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
  const [hovered, setHovered] = useState(null);

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

      {/* Tile row — DockMorph style */}
      <div className="nbr-dock">
        {TILES.map((tile, i) => (
          <div
            key={tile.id}
            className="nbr-dock-item-wrap"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === i && <span className="nbr-dock-bubble" />}
            <button
              className={`nbr-dock-btn ${activeTile === tile.id ? 'active' : ''}`}
              onClick={() => onTileClick(tile.id)}
              title={tile.label}
            >
              <span className="nbr-dock-icon">{tile.icon}</span>
              <span className="nbr-dock-label">{tile.label}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

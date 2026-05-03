import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, DollarSign, Footprints, MapPin, Sofa, ClipboardCheck } from 'lucide-react';

const TILES = [
  { id: 'listings',  Icon: Home,           label: 'Listings' },
  { id: 'costs',     Icon: DollarSign,     label: 'Costs' },
  { id: 'walkscore', Icon: Footprints,     label: 'Walk' },
  { id: 'insights',  Icon: MapPin,         label: 'Insights' },
  { id: 'layout',    Icon: Sofa,           label: 'Room' },
  { id: 'checklist', Icon: ClipboardCheck, label: 'Checklist' },
];

const NOISE_CLASS = { quiet: 'badge-green', moderate: 'badge-amber', loud: 'badge-red' };
const PARK_CLASS  = { easy: 'badge-green',  moderate: 'badge-amber', hard: 'badge-red' };

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

      {/* DockMorph tile row */}
      <div className="nbr-dock-row">
        <div className="nbr-dock-pill">
          {TILES.map(({ id, Icon, label }, i) => (
            <div
              key={id}
              className="nbr-dock-item"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Morphic glass bubble */}
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    className="nbr-dock-bubble"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1.4, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  />
                )}
              </AnimatePresence>

              {/* Tooltip */}
              {hovered === i && (
                <div className="nbr-dock-tooltip">{label}</div>
              )}

              {/* Icon button */}
              <motion.button
                className={`nbr-dock-btn${activeTile === id ? ' active' : ''}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTileClick(id)}
              >
                <Icon className="nbr-dock-icon-svg" />
                <span className="nbr-dock-label">{label}</span>
              </motion.button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

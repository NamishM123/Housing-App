import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Home, DollarSign, Footprints, MapPin, Sofa, ClipboardCheck } from 'lucide-react';

const TILES = [
  { id: 'listings',  Icon: Home,            label: 'Listings' },
  { id: 'costs',     Icon: DollarSign,      label: 'Costs' },
  { id: 'walkscore', Icon: Footprints,      label: 'Walk' },
  { id: 'insights',  Icon: MapPin,          label: 'Insights' },
  { id: 'layout',    Icon: Sofa,            label: 'Room' },
  { id: 'checklist', Icon: ClipboardCheck,  label: 'Checklist' },
];

const NOISE_CLASS  = { quiet: 'badge-green', moderate: 'badge-amber', loud: 'badge-red' };
const PARK_CLASS   = { easy: 'badge-green',  moderate: 'badge-amber', hard: 'badge-red' };

function DockButton({ Icon, label, active, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`nbr-dock-btn${active ? ' active' : ''}`}
      title={label}
    >
      <Icon className="nbr-dock-icon-svg" />
      <span className="nbr-dock-tooltip">{label}</span>
      <span className="nbr-dock-label">{label}</span>
    </motion.button>
  );
}

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

      {/* Dock row */}
      <div className="nbr-dock-row">
        <motion.div
          className="nbr-dock-pill"
          animate={{ y: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {TILES.map(({ id, Icon, label }) => (
            <DockButton
              key={id}
              Icon={Icon}
              label={label}
              active={activeTile === id}
              onClick={() => onTileClick(id)}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

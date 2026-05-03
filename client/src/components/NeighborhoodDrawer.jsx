import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  DollarSign,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const TILES = [
  { id: 'listings', Icon: Home,         label: 'Listings' },
  { id: 'costs',    Icon: DollarSign,   label: 'Costs' },
  { id: 'insights', Icon: MapPin,       label: 'Insights' },
];

const NOISE_CLASS = { quiet: 'badge-green', moderate: 'badge-amber', loud: 'badge-red' };
const PARK_CLASS  = { easy: 'badge-green',  moderate: 'badge-amber', hard: 'badge-red' };

export default function NeighborhoodDrawer({
  open,
  neighborhood,
  onTileClick,
  activeTile,
  onPrev,
  onNext,
}) {
  const [hovered, setHovered] = useState(null);
  const barRef = useRef(null);

  // Spotlight glow tracking — mirrors GlowCard but inline so we don't have
  // to fight specificity with the drawer's bespoke background/border-radius.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
      el.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
      el.style.setProperty('--glow-active', '1');
    };
    const onLeave = () => el.style.setProperty('--glow-active', '0');
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerenter', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [open, neighborhood?.id]);

  if (!open || !neighborhood) return null;

  const noiseCls   = NOISE_CLASS[neighborhood.noiseLevel]       || 'badge-muted';
  const parkingCls = PARK_CLASS[neighborhood.parkingDifficulty] || 'badge-muted';

  return (
    <div className="nbr-bar nbr-bar-glow" ref={barRef}>
      {/* Name + quick stats */}
      <div className="nbr-header">
        <div className="nbr-info">
          <div className="nbr-name-row">
            <h2 className="nbr-name">{neighborhood.name}</h2>
            {/* Prev / Next city navigation (replaces the close-X) */}
            <div className="nbr-nav-arrows">
              <button
                className="nbr-nav-btn"
                onClick={onPrev}
                aria-label="Previous city"
                title="Previous city"
              >
                <ChevronLeft className="nbr-nav-icon" />
              </button>
              <button
                className="nbr-nav-btn"
                onClick={onNext}
                aria-label="Next city"
                title="Next city"
              >
                <ChevronRight className="nbr-nav-icon" />
              </button>
            </div>
          </div>
          <div className="nbr-quick-stats">
            {neighborhood.noiseLevel && (
              <span className={`nbr-quick-badge ${noiseCls}`}>{neighborhood.noiseLevel} noise</span>
            )}
            {neighborhood.noiseLevel && neighborhood.parkingDifficulty && (
              <span className="nbr-sep">|</span>
            )}
            {neighborhood.parkingDifficulty && (
              <span className={`nbr-quick-badge ${parkingCls}`}>{neighborhood.parkingDifficulty} parking</span>
            )}
          </div>
        </div>
      </div>

      {/* DockMorph tile row */}
      <div className="nbr-dock-row">
        <div className="nbr-dock-pill">
          {TILES.map(({ id, Icon, label }, i) => {
            const isActive  = activeTile === id;
            const showBubble = hovered === i || isActive;
            return (
              <div
                key={id}
                className="nbr-dock-item"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Morphic glass bubble — appears on hover OR when active */}
                <AnimatePresence>
                  {showBubble && (
                    <motion.div
                      className="nbr-dock-bubble"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1.4, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    />
                  )}
                </AnimatePresence>

                {/* Tooltip — shown on hover only */}
                <AnimatePresence>
                  {hovered === i && (
                    <motion.div
                      className="nbr-dock-tooltip"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12 }}
                    >
                      {label}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Icon-only button (DockMorph style) */}
                <motion.button
                  className={`nbr-dock-btn${isActive ? ' active' : ''}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onTileClick(id)}
                  aria-label={label}
                >
                  <Icon className="nbr-dock-icon-svg" />
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

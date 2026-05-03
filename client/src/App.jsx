import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import OnboardingForm from './components/OnboardingForm';
import MapView from './components/MapView';
import NeighborhoodDrawer from './components/NeighborhoodDrawer';
import NeighborhoodPanel from './components/NeighborhoodPanel';

import LandingPage from './components/LandingPage';
import { fetchListings } from './utils/api';
import { geocodeAddress } from './utils/mapbox';
import { NEIGHBORHOODS } from './data/neighborhoods';
import './App.css';

// Refine listing coordinates by forward-geocoding their addresses, so pins
// land on the actual building rather than approximate parcel centers.
async function refineListingCoords(listings) {
  const refined = await Promise.all(
    (listings || []).map(async (l) => {
      const hit = await geocodeAddress(l.address, l.city, l.zip);
      return hit ? { ...l, lat: hit.lat, lng: hit.lng } : l;
    })
  );
  return refined;
}

function SidebarStars() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.008;
      ref.current.rotation.x += delta * 0.003;
    }
  });
  return (
    <group ref={ref}>
      <Stars radius={100} depth={50} count={1200} factor={6}   saturation={0.25} fade speed={0.4} />
      <Stars radius={140} depth={70} count={4500} factor={3.2} saturation={0.4}  fade speed={0.6} />
    </group>
  );
}

export default function App() {
  const [showLanding, setShowLanding]           = useState(true);
  const [submittedForm, setSubmittedForm]       = useState(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [hoveredNeighborhood, setHoveredNeighborhood]   = useState(null);
  const [drawerOpen, setDrawerOpen]             = useState(false);
  const [activePanelTab, setActivePanelTab]     = useState(null); // null = panel closed
  const [listings, setListings]                 = useState([]);
  const [listingsLoading, setListingsLoading]   = useState(false);
  const [searchUrls, setSearchUrls]             = useState(null);
  const [shortlist, setShortlist]               = useState([]);
  const [selectedListing, setSelectedListing]   = useState(null);

  const [leftPinned, setLeftPinned]             = useState(true);
  const [rightPinned, setRightPinned]           = useState(false);
  const [bottomPinned, setBottomPinned]         = useState(false);

  const handleFormSubmit = useCallback((formData) => {
    setSubmittedForm(formData);
    // Intentionally NOT clearing selectedNeighborhood / listings / selectedListing
    // here. When the user re-submits the form with a new salary or housing %,
    // we want the existing listings to immediately re-filter against the new
    // maxRent (handled by `displayedListings` below) instead of disappearing
    // and forcing a fresh neighborhood click.
    setLeftPinned(false); // Auto-hide sidebar after searching
  }, []);

  // Internal: load a neighborhood's listings + side-effects.
  // `preserveTab` keeps the right-side panel open on the same tab when the
  // user is cycling between cities (prev / next arrows in the dock).
  const loadNeighborhood = useCallback((neighborhood, { preserveTab = false } = {}) => {
    setSelectedNeighborhood(neighborhood);
    setDrawerOpen(true);
    setBottomPinned(true);
    if (!preserveTab) {
      setActivePanelTab(null);
      setRightPinned(false);
    }
    setListings([]);
    setListingsLoading(true);
    setSelectedListing(null);
    fetchListings(neighborhood.zip, neighborhood.name)
      .then(async ({ listings: l, urls }) => {
        const base = l || [];
        setSearchUrls(urls);
        // Show approximate pins immediately, then refine via geocoding so
        // each pin sits on the actual address.
        setListings(base);
        const refined = await refineListingCoords(base);
        setListings(refined);
      })
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false));
  }, []);

  const handleNeighborhoodSelect = useCallback((neighborhood) => {
    loadNeighborhood(neighborhood);
  }, [loadNeighborhood]);

  // Lightweight hover preview: just shows the bottom dock with the city's
  // header info. Skipped while a city is fully selected so the dock keeps
  // matching the selection (and we don't churn UI on stray cursor sweeps).
  const handleNeighborhoodHover = useCallback((neighborhood) => {
    if (selectedNeighborhood) return;
    setHoveredNeighborhood(neighborhood);
    setBottomPinned(true);
  }, [selectedNeighborhood]);

  // Prev / Next city cycling — driven by the chevrons in the bottom dock.
  // Uses the canonical NEIGHBORHOODS order and wraps around at both ends.
  // We preserve the active tab so users browsing "Listings" can flip
  // through cities without losing the panel they were looking at.
  const cycleNeighborhood = useCallback((delta) => {
    setSelectedNeighborhood((curr) => {
      if (!curr) return curr;
      const idx = NEIGHBORHOODS.findIndex(n => n.id === curr.id);
      if (idx === -1) return curr;
      const nextIdx = (idx + delta + NEIGHBORHOODS.length) % NEIGHBORHOODS.length;
      const next = NEIGHBORHOODS[nextIdx];
      // Defer side-effects so they run with the new neighborhood selected.
      queueMicrotask(() => loadNeighborhood(next, { preserveTab: true }));
      return next;
    });
  }, [loadNeighborhood]);

  const handlePrevCity = useCallback(() => cycleNeighborhood(-1), [cycleNeighborhood]);
  const handleNextCity = useCallback(() => cycleNeighborhood(+1), [cycleNeighborhood]);

  // Edge-swipe: cursor tucked into the very left strip brings the sidebar back
  // and stows the bottom bar so the form is the focus again.
  useEffect(() => {
    const EDGE_PX = 8;
    let nearEdge = false;
    const onMove = (e) => {
      const within = e.clientX <= EDGE_PX;
      if (within && !nearEdge) {
        setLeftPinned(true);
        setBottomPinned(false);
        setHoveredNeighborhood(null);
      }
      nearEdge = within;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const handleTileClick = useCallback((tileId) => {
    // If the dock is showing a hover-only preview, promote to a real selection
    // so the right panel has listings/data to render.
    if (!selectedNeighborhood && hoveredNeighborhood) {
      loadNeighborhood(hoveredNeighborhood);
    }
    setActivePanelTab(prev => {
      const next = prev === tileId ? null : tileId;
      setRightPinned(!!next);
      if (next) setBottomPinned(false); // Auto-hide bottom bar when right panel opens
      return next;
    });
  }, [selectedNeighborhood, hoveredNeighborhood, loadNeighborhood]);

  const handlePanelClose = useCallback(() => {
    setActivePanelTab(null);
    setRightPinned(false);
  }, []);

  const handleShortlist = useCallback((listing) => {
    setShortlist(prev => {
      const exists = prev.some(s => s.id === listing.id);
      return exists ? prev.filter(s => s.id !== listing.id) : [...prev, listing];
    });
  }, []);

  const handleListingSelect = useCallback((listing) => {
    setSelectedListing(listing);
    setDrawerOpen(true);
  }, []);

  const monthlyIncome   = submittedForm ? Math.round(submittedForm.salary / 12) : 0;
  const maxRent         = submittedForm?.maxRent ?? null;
  const rightPanelOpen  = !!activePanelTab;

  // Scale the visible inventory with the user's income & housing-percentage
  // strategy: as the cap rises, more listings pass the filter. Before the
  // form is submitted (no maxRent yet) we show the full set so the listings
  // grid never looks broken.
  const displayedListings = maxRent
    ? listings.filter(l => l.price <= maxRent)
    : listings;

  return (
    <div className="app">
      {showLanding && <LandingPage onComplete={() => setShowLanding(false)} />}
      <div className="app-body">
        {/* Map is now full-screen background */}
        <main className="main-content">
          <MapView
            monthlyIncome={monthlyIncome}
            roommates={submittedForm?.roommates ?? 0}
            maxRent={maxRent}
            vibe={submittedForm?.vibe ?? 'any'}
            onNeighborhoodSelect={handleNeighborhoodSelect}
            onNeighborhoodHover={handleNeighborhoodHover}
            selectedId={selectedNeighborhood?.id}
            listings={displayedListings}
            shortlist={shortlist}
            onListingSelect={handleListingSelect}
            selectedListing={selectedListing}
            landingActive={showLanding}
            sidebarOpen={leftPinned}
          />
        </main>

        {/* Invisible hover zone on the left edge — entering it reopens the sidebar.
            Replaces the visible reopen tab so the map stays uncluttered. */}
        {!leftPinned && (
          <div
            className="sidebar-hover-zone"
            onMouseEnter={() => setLeftPinned(true)}
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar Wrapper */}
        <div className={`sidebar-wrapper ${leftPinned ? 'pinned' : ''}`}>
          <div className="sidebar-stars-bg">
            <Canvas camera={{ position: [0, 0, 1], fov: 60 }} gl={{ alpha: true }} style={{ background: 'transparent' }}>
              <SidebarStars />
            </Canvas>
          </div>
          {/* Hide-sidebar chip only after the user has submitted the form,
              so the onboarding step can't be skipped or hidden. */}
          {submittedForm && (
            <button
              className="sidebar-back-btn"
              onClick={() => setLeftPinned(false)}
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>
          )}
          <aside className="sidebar">
            <div className="sidebar-brand">
              <img
                src="/settlr-mark.svg"
                alt="Settlr"
                className="sidebar-logo-full"
              />
              {shortlist.length > 0 && (
                <div className="shortlist-badge" title={`${shortlist.length} saved listing${shortlist.length > 1 ? 's' : ''}`}>
                  ★ {shortlist.length}
                </div>
              )}
            </div>

            <OnboardingForm onSubmit={handleFormSubmit} />
          </aside>
        </div>

      </div>

      {/* Bottom tile bar Wrapper — hidden whenever the sidebar is open so
          the user editing their income gets a clean canvas. */}
      {!leftPinned && (selectedNeighborhood || hoveredNeighborhood) && (
        <div className={`nbr-bar-wrapper ${bottomPinned ? 'pinned' : ''}`}>
          <div className="nbr-bar-edge-tab" onClick={() => setBottomPinned(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
          </div>
          <NeighborhoodDrawer
            open={true}
            neighborhood={selectedNeighborhood || hoveredNeighborhood}
            onTileClick={handleTileClick}
            activeTile={activePanelTab}
            onPrev={handlePrevCity}
            onNext={handleNextCity}
          />
        </div>
      )}

      {/* Right-side detail panel Wrapper — also hidden when the sidebar is open. */}
      {!leftPinned && selectedNeighborhood && activePanelTab && (
        <div className={`n-panel-wrapper ${rightPinned ? 'pinned' : ''} ${activePanelTab === 'listings' ? 'wide' : ''}`}>
          <div className="n-panel-edge-tab" onClick={() => setRightPinned(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <NeighborhoodPanel
            open={true}
            activeTab={activePanelTab}
            neighborhood={selectedNeighborhood}
            form={submittedForm}
            onClose={handlePanelClose}
            listings={displayedListings}
            listingsLoading={listingsLoading}
            searchUrls={searchUrls}
            shortlist={shortlist}
            onShortlist={handleShortlist}
          />
        </div>
      )}
    </div>
  );
}

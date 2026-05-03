import { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import OnboardingForm from './components/OnboardingForm';
import MapView from './components/MapView';
import VerdictPanel from './components/VerdictPanel';
import NeighborhoodDrawer from './components/NeighborhoodDrawer';
import NeighborhoodPanel from './components/NeighborhoodPanel';

import LandingPage from './components/LandingPage';
import { fetchListings } from './utils/api';
import { geocodeAddress } from './utils/mapbox';
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
  const [drawerOpen, setDrawerOpen]             = useState(false);
  const [activePanelTab, setActivePanelTab]     = useState(null); // null = panel closed
  const [verdict, setVerdict]                   = useState(null);
  const [verdictLoading, setVerdictLoading]     = useState(false);
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
    setVerdict(null); // verdict depends on income — recompute next time
    // Intentionally NOT clearing selectedNeighborhood / listings / selectedListing
    // here. When the user re-submits the form with a new salary or housing %,
    // we want the existing listings to immediately re-filter against the new
    // maxRent (handled by `displayedListings` below) instead of disappearing
    // and forcing a fresh neighborhood click.
    setLeftPinned(false); // Auto-hide sidebar after searching
  }, []);

  const handleNeighborhoodSelect = useCallback((neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    setDrawerOpen(true);
    setActivePanelTab(null);
    setBottomPinned(true);
    setRightPinned(false);
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

  const handleDrawerClose = useCallback(() => {
    setSelectedNeighborhood(null);
    setDrawerOpen(false);
    setActivePanelTab(null);
    setBottomPinned(false);
    setRightPinned(false);
  }, []);

  const handleTileClick = useCallback((tileId) => {
    setActivePanelTab(prev => {
      const next = prev === tileId ? null : tileId;
      setRightPinned(!!next);
      if (next) setBottomPinned(false); // Auto-hide bottom bar when right panel opens
      return next;
    });
  }, []);

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
            selectedId={selectedNeighborhood?.id}
            listings={displayedListings}
            shortlist={shortlist}
            onListingSelect={handleListingSelect}
            selectedListing={selectedListing}
          />
        </main>

        {/* Always-visible reopen tab — sits outside the wrapper so
            `overflow: hidden` can't clip it after the sidebar slides away. */}
        {!leftPinned && (
          <button
            className="sidebar-reopen-tab"
            onClick={() => setLeftPinned(true)}
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}

        {/* Left Sidebar Wrapper */}
        <div className={`sidebar-wrapper ${leftPinned ? 'pinned' : ''}`}>
          <div className="sidebar-stars-bg">
            <Canvas camera={{ position: [0, 0, 1], fov: 60 }} gl={{ alpha: true }} style={{ background: 'transparent' }}>
              <SidebarStars />
            </Canvas>
          </div>
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

            {submittedForm && (
              <VerdictPanel
                form={submittedForm}
                neighborhood={selectedNeighborhood}
                verdict={verdict}
                setVerdict={setVerdict}
                loading={verdictLoading}
                setLoading={setVerdictLoading}
              />
            )}


          </aside>
        </div>

      </div>

      {/* Bottom tile bar Wrapper */}
      {selectedNeighborhood && (
        <div className={`nbr-bar-wrapper ${bottomPinned ? 'pinned' : ''}`}>
          <div className="nbr-bar-edge-tab" onClick={() => setBottomPinned(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
          </div>
          <NeighborhoodDrawer
            open={true}
            neighborhood={selectedNeighborhood}
            onClose={handleDrawerClose}
            onTileClick={handleTileClick}
            activeTile={activePanelTab}
          />
        </div>
      )}

      {/* Right-side detail panel Wrapper */}
      {selectedNeighborhood && activePanelTab && (
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

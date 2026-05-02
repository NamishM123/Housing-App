import { useState, useCallback } from 'react';
import OnboardingForm from './components/OnboardingForm';
import MapView from './components/MapView';
import VerdictPanel from './components/VerdictPanel';
import NeighborhoodDrawer from './components/NeighborhoodDrawer';
import NeighborhoodPanel from './components/NeighborhoodPanel';
import CityComparison from './components/CityComparison';
import LandingPage from './components/LandingPage';
import { fetchListings } from './utils/api';
import './App.css';

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
    setVerdict(null);
    setSelectedNeighborhood(null);
    setDrawerOpen(false);
    setActivePanelTab(null);
    setListings([]);
    setSearchUrls(null);
    setSelectedListing(null);
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
      .then(({ listings: l, urls }) => { setListings(l || []); setSearchUrls(urls); })
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
  const rightPanelOpen  = !!activePanelTab;

  return (
    <div className="app">
      {showLanding && <LandingPage onComplete={() => setShowLanding(false)} />}
      <div className="app-body">
        {/* Map is now full-screen background */}
        <main className="main-content">
          <MapView
            monthlyIncome={monthlyIncome}
            roommates={submittedForm?.roommates ?? 0}
            maxRent={submittedForm?.maxRent ?? null}
            vibe={submittedForm?.vibe ?? 'any'}
            onNeighborhoodSelect={handleNeighborhoodSelect}
            selectedId={selectedNeighborhood?.id}
            listings={listings}
            shortlist={shortlist}
            onListingSelect={handleListingSelect}
            selectedListing={selectedListing}
          />
        </main>

        {/* Left Sidebar Wrapper */}
        <div className={`sidebar-wrapper ${leftPinned ? 'pinned' : ''}`}>
          <div className="sidebar-edge-tab" onClick={() => setLeftPinned(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <aside className="sidebar">
            <button className="sidebar-close-btn" onClick={() => setLeftPinned(false)} title="Hide sidebar">✕</button>
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

            <CityComparison />
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
        <div className={`n-panel-wrapper ${rightPinned ? 'pinned' : ''}`}>
          <div className="n-panel-edge-tab" onClick={() => setRightPinned(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <NeighborhoodPanel
            open={true}
            activeTab={activePanelTab}
            neighborhood={selectedNeighborhood}
            form={submittedForm}
            onClose={handlePanelClose}
            listings={listings}
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

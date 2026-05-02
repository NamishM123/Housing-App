import { useState, useCallback } from 'react';
import OnboardingForm from './components/OnboardingForm';
import MapView from './components/MapView';
import VerdictPanel from './components/VerdictPanel';
import NeighborhoodDrawer from './components/NeighborhoodDrawer';
import NeighborhoodPanel from './components/NeighborhoodPanel';
import CityComparison from './components/CityComparison';
import { fetchListings } from './utils/api';
import './App.css';

export default function App() {
  const [submittedForm, setSubmittedForm] = useState(null);
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

  const handleFormSubmit = useCallback((formData) => {
    setSubmittedForm(formData);
    setVerdict(null);
    setSelectedNeighborhood(null);
    setDrawerOpen(false);
    setActivePanelTab(null);
    setListings([]);
    setSearchUrls(null);
    setSelectedListing(null);
  }, []);

  const handleNeighborhoodSelect = useCallback((neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    setDrawerOpen(true);
    setActivePanelTab(null);   // close panel when switching neighborhood
    setListings([]);
    setListingsLoading(true);
    setSelectedListing(null);
    fetchListings(neighborhood.zip, neighborhood.name)
      .then(({ listings: l, urls }) => { setListings(l || []); setSearchUrls(urls); })
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false));
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setActivePanelTab(null);
  }, []);

  const handleTileClick = useCallback((tileId) => {
    setActivePanelTab(prev => (prev === tileId ? null : tileId));
  }, []);

  const handlePanelClose = useCallback(() => setActivePanelTab(null), []);

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
      <div className="app-body">
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

          <CityComparison />
        </aside>

        {/* Map shrinks when right panel is open */}
        <main className={`main-content ${rightPanelOpen ? 'panel-open' : ''}`}>
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
            rightPanelOpen={rightPanelOpen}
          />
        </main>
      </div>

      {/* Bottom tile bar */}
      {selectedNeighborhood && (
        <NeighborhoodDrawer
          open={drawerOpen}
          neighborhood={selectedNeighborhood}
          onClose={handleDrawerClose}
          onTileClick={handleTileClick}
          activeTile={activePanelTab}
          rightPanelOpen={rightPanelOpen}
        />
      )}

      {/* Right-side detail panel */}
      {selectedNeighborhood && (
        <NeighborhoodPanel
          open={rightPanelOpen}
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
      )}
    </div>
  );
}

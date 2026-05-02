import { useState, useCallback } from 'react';
import InputForm from './components/InputForm';
import MapView from './components/MapView';
import VerdictPanel from './components/VerdictPanel';
import NeighborhoodDrawer from './components/NeighborhoodDrawer';
import CityComparison from './components/CityComparison';
import { fetchListings } from './utils/api';
import './App.css';

// Settler brand mark — simplified recreation of the S-curve + houses logo
function SettlerMark() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="settler-mark">
      {/* Upper S arc */}
      <path
        d="M66 50 C78 46 84 30 68 19 C52 8 26 13 18 30 C12 42 22 53 38 54"
        stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" fill="none"
      />
      {/* Lower S arc */}
      <path
        d="M52 54 C68 55 88 62 88 76 C88 90 72 98 54 96 C36 94 22 84 24 70 C26 60 36 52 52 54"
        stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" fill="none"
      />
      {/* House left */}
      <path d="M24 76 L24 63 L32 55 L40 63 L40 76" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" fill="none"/>
      <rect x="27.5" y="66" width="9" height="10" stroke="currentColor" strokeWidth="2.2" fill="none"/>
      {/* House center — taller */}
      <path d="M40 76 L40 59 L50 49 L60 59 L60 76" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" fill="none"/>
      <rect x="44" y="63" width="12" height="13" stroke="currentColor" strokeWidth="2.2" fill="none"/>
      {/* Building right */}
      <rect x="61" y="57" width="17" height="19" stroke="currentColor" strokeWidth="2.8" fill="none"/>
      <rect x="64.5" y="61" width="4" height="4" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <rect x="70.5" y="61" width="4" height="4" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <rect x="64.5" y="67" width="4" height="4" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <rect x="70.5" y="67" width="4" height="4" stroke="currentColor" strokeWidth="1.8" fill="none"/>
    </svg>
  );
}

const DEFAULT_FORM = {
  jobTitle: '',
  salary: 65000,
  savings: 10000,
  roommates: 0,
  hasCar: true,
  hasPet: false,
  lifestyle: 'sometimes',
  maxRent: null,
  vibe: 'any',
  workSetup: 'hybrid',
  workLocation: 'remote',
  mustHaves: [],
  proximityPrefs: {},
  timeline: 'asap',
};

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [searchUrls, setSearchUrls] = useState(null);
  const [shortlist, setShortlist] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);

  const handleFormSubmit = useCallback((formData) => {
    setSubmittedForm(formData);
    setVerdict(null);
    setSelectedNeighborhood(null);
    setDrawerOpen(false);
    setListings([]);
    setSearchUrls(null);
    setSelectedListing(null);
  }, []);

  const handleNeighborhoodSelect = useCallback((neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    setDrawerOpen(true);
    setListings([]);
    setListingsLoading(true);
    setSelectedListing(null);
    fetchListings(neighborhood.zip, neighborhood.name)
      .then(({ listings: l, urls }) => {
        setListings(l || []);
        setSearchUrls(urls);
      })
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false));
  }, []);

  const handleDrawerClose = useCallback(() => setDrawerOpen(false), []);

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

  const monthlyIncome = submittedForm ? Math.round(submittedForm.salary / 12) : 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="settler-header">
          <SettlerMark />
          <div className="settler-wordmark">
            <span className="settler-name">SETTLER</span>
            <span className="settler-tagline">Your Home Your Way</span>
          </div>
        </div>

        <div className="header-right">
          <span className="header-location-pill">📍 San Luis Obispo County</span>
          {shortlist.length > 0 && (
            <div className="shortlist-badge">★ {shortlist.length} saved</div>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <InputForm form={form} setForm={setForm} onSubmit={handleFormSubmit} />
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
      </div>

      {selectedNeighborhood && (
        <NeighborhoodDrawer
          open={drawerOpen}
          neighborhood={selectedNeighborhood}
          form={submittedForm}
          onClose={handleDrawerClose}
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

import { useState, useCallback } from 'react';
import InputForm from './components/InputForm';
import MapView from './components/MapView';
import VerdictPanel from './components/VerdictPanel';
import NeighborhoodDrawer from './components/NeighborhoodDrawer';
import CityComparison from './components/CityComparison';
import { fetchListings } from './utils/api';
import './App.css';

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

  const handleFormSubmit = useCallback((formData) => {
    setSubmittedForm(formData);
    setVerdict(null);
    setSelectedNeighborhood(null);
    setDrawerOpen(false);
    setListings([]);
    setSearchUrls(null);
  }, []);

  const handleNeighborhoodSelect = useCallback((neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    setDrawerOpen(true);
    setListings([]);
    setListingsLoading(true);
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

  // When a listing pin is clicked on the map, open drawer on listings tab
  const handleListingSelect = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const monthlyIncome = submittedForm ? Math.round(submittedForm.salary / 12) : 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <span className="header-icon">🏠</span>
            <h1>Can I Afford SLO?</h1>
          </div>
          <p className="header-subtitle">AI-powered relocation assistant for San Luis Obispo County</p>
        </div>
        {shortlist.length > 0 && (
          <div className="shortlist-badge">
            ★ {shortlist.length} shortlisted
          </div>
        )}
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

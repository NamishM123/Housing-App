import { useState, useCallback } from 'react';
import InputForm from './components/InputForm';
import MapView from './components/MapView';
import VerdictPanel from './components/VerdictPanel';
import NeighborhoodDrawer from './components/NeighborhoodDrawer';
import CityComparison from './components/CityComparison';
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
  commute: 'medium',
  workSetup: 'hybrid',
  mustHaves: [],
  timeline: 'asap',
};

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

  const handleFormSubmit = useCallback((formData) => {
    setSubmittedForm(formData);
    setVerdict(null);
    setSelectedNeighborhood(null);
    setDrawerOpen(false);
  }, []);

  const handleNeighborhoodSelect = useCallback((neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
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
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <InputForm
            form={form}
            setForm={setForm}
            onSubmit={handleFormSubmit}
          />
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
          />
        </main>
      </div>

      {selectedNeighborhood && (
        <NeighborhoodDrawer
          open={drawerOpen}
          neighborhood={selectedNeighborhood}
          form={submittedForm}
          onClose={handleDrawerClose}
        />
      )}
    </div>
  );
}

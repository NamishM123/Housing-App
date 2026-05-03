import { useMemo, useState } from 'react';
import IncomeInput, { validateIncome } from './IncomeInput';
import WorkLocationField from './WorkLocationField';

const DEFAULT_RENT_PCT = 30;
const MIN_RENT_PCT = 5;
const MAX_RENT_PCT = 80;

const SITUATIONS = [
  { id: 'solo', label: 'Solo', sub: 'Just me' },
  { id: 'partner', label: 'Partner', sub: 'Me and my person' },
  { id: 'roommates', label: 'Roommates', sub: 'Splitting rent' },
  { id: 'family', label: 'Family', sub: 'Kids in the mix' },
];

const TOLERANCE = [
  { id: 'walk', label: 'Walk or bike', sub: 'under 10 min' },
  { id: 'short', label: 'Short drive', sub: '10–20 min' },
  { id: 'long', label: 'Worth it for savings', sub: '20–35 min' },
  { id: 'remote', label: 'Remote', sub: 'I work from home' },
];

const ROOMMATE_OPTS = [1, 2, 3];

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

const workLabel = (situation) => {
  if (situation === 'partner') return 'Where do you both work?';
  if (situation === 'roommates') return 'Where does everyone work?';
  return 'Where do you work?';
};

export default function OnboardingForm({ onSubmit, loading }) {
  const [annualIncome, setAnnualIncome] = useState(65000);
  const [rentPct, setRentPct] = useState(DEFAULT_RENT_PCT);
  const [situation, setSituation] = useState('solo');
  const [partnerIncome, setPartnerIncome] = useState(null);
  const [roommateCount, setRoommateCount] = useState(1);
  const [roommateIncomes, setRoommateIncomes] = useState({});
  const [primaryWork, setPrimaryWork] = useState(null);
  const [partnerWork, setPartnerWork] = useState(null);
  const [roommateWorks, setRoommateWorks] = useState({});
  const [tolerance, setTolerance] = useState('short');
  const [errors, setErrors] = useState({});

  const isRemoteOnly = tolerance === 'remote';

  const incomes = useMemo(() => {
    const list = [annualIncome || 0];
    if (situation === 'partner' && partnerIncome) list.push(Number(partnerIncome));
    if (situation === 'roommates') {
      Object.values(roommateIncomes).forEach(v => {
        if (v) list.push(Number(v));
      });
    }
    return list.filter(n => n > 0);
  }, [annualIncome, situation, partnerIncome, roommateIncomes]);

  const combinedAnnual = incomes.reduce((a, b) => a + b, 0);
  const combinedMonthly = Math.round(combinedAnnual / 12);
  const showCombined =
    (situation === 'partner' && partnerIncome) ||
    (situation === 'roommates' && Object.values(roommateIncomes).some(v => v));

  const strategyPct = STRATEGIES.find(s => s.id === strategy)?.pct ?? 0.30;
  const maxRent = Math.round((combinedAnnual * strategyPct) / 12);

  const validate = () => {
    const e = {};
    const incomeErr = validateIncome(annualIncome);
    if (incomeErr) e.annualIncome = incomeErr;
    if (situation === 'partner' && partnerIncome != null && partnerIncome !== '' && Number(partnerIncome) < 0) {
      e.partnerIncome = "Can't be negative";
    }
    if (!isRemoteOnly && !primaryWork) {
      e.primaryWork = 'Pick a workplace or "I work remote"';
    }
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const workLocations = [];
    if (primaryWork && !primaryWork.remote) workLocations.push(primaryWork);
    if (situation === 'partner' && partnerWork && !partnerWork.remote) {
      workLocations.push(partnerWork);
    }
    if (situation === 'roommates') {
      Object.values(roommateWorks).forEach(w => {
        if (w && !w.remote) workLocations.push(w);
      });
    }

    onSubmit({
      annualIncome,
      housingStrategy: strategy,
      strategyPct,
      livingSituation: situation,
      partnerIncome: situation === 'partner' ? Number(partnerIncome) || null : null,
      roommateCount: situation === 'roommates' ? roommateCount : 0,
      roommateIncomes: situation === 'roommates' ? roommateIncomes : {},
      combinedAnnualIncome: combinedAnnual || annualIncome,
      workLocations,
      primaryWorkRemote: !!primaryWork?.remote || isRemoteOnly,
      commuteTolerance: tolerance,
      // Backward-compat keys downstream code reads:
      salary: combinedAnnual || annualIncome,
      maxRent,
      roommates: situation === 'roommates' ? roommateCount : 0,
      vibe: 'any',
      jobTitle: '',
      savings: 0,
      hasCar: tolerance !== 'walk',
      hasPet: false,
      lifestyle: 'sometimes',
      workSetup: isRemoteOnly ? 'remote' : 'hybrid',
      workLocation: primaryWork?.remote ? 'remote' : 'downtown-slo',
      mustHaves: [],
      proximityPrefs: {},
      timeline: 'asap',
    });
  };

  return (
    <form className="onboarding-form" onSubmit={handleSubmit}>
      {/* Q1 — Income */}
      <section className="q-section">
        <IncomeInput
          value={annualIncome}
          onChange={setAnnualIncome}
          error={errors.annualIncome}
        />
      </section>

      {/* Q2 — Housing strategy */}
      <section className="q-section">
        <label className="q-label">How do you want to spend on rent?</label>
        <span className="hint">Pick the one that sounds most like you.</span>
        <div className="seg-stack">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              type="button"
              className={`seg-row ${strategy === s.id ? 'active' : ''}`}
              onClick={() => setStrategy(s.id)}
            >
              <span className="seg-label">{s.label}</span>
              <span className="seg-sub">{s.sub}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Q3 — Living situation */}
      <section className="q-section">
        <label className="q-label">Who's moving with you?</label>
        <span className="hint">This changes the math — combined income, rent splits, the whole map.</span>
        <div className="situation-grid">
          {SITUATIONS.map(s => (
            <button
              key={s.id}
              type="button"
              className={`situation-btn ${situation === s.id ? 'active' : ''}`}
              onClick={() => setSituation(s.id)}
            >
              <span className="situation-label">{s.label}</span>
              <span className="situation-sub">{s.sub}</span>
            </button>
          ))}
        </div>

        {situation === 'partner' && (
          <div className="form-group nested">
            <label>Your partner's income</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Optional"
                value={partnerIncome ?? ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, '');
                  setPartnerIncome(v === '' ? null : Number(v));
                }}
              />
            </div>
            {errors.partnerIncome && <span className="error-msg">{errors.partnerIncome}</span>}
          </div>
        )}

        {situation === 'roommates' && (
          <>
            <div className="form-group nested">
              <label>How many roommates?</label>
              <div className="seg-row-h">
                {ROOMMATE_OPTS.map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`seg-pill ${roommateCount === n ? 'active' : ''}`}
                    onClick={() => setRoommateCount(n)}
                  >
                    {n === 3 ? '3+' : n}
                  </button>
                ))}
              </div>
            </div>
            {Array.from({ length: roommateCount }).map((_, i) => (
              <div className="form-group nested" key={i}>
                <label>Roommate {i + 1}'s income</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Optional"
                    value={roommateIncomes[i] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, '');
                      setRoommateIncomes(s => ({ ...s, [i]: v === '' ? null : Number(v) }));
                    }}
                  />
                </div>
              </div>
            ))}
          </>
        )}

        {showCombined && (
          <div className="combined-display">
            Combined household: ~{fmt(combinedMonthly)}/mo gross
          </div>
        )}
      </section>

      {/* Q4 — Work locations */}
      {!isRemoteOnly && (
        <section className="q-section">
          <label className="q-label">{workLabel(situation)}</label>
          <span className="hint">Type an address, or pick a common one. Working from home? Skip this.</span>
          <WorkLocationField
            label=""
            value={primaryWork}
            onChange={setPrimaryWork}
          />
          {errors.primaryWork && <span className="error-msg">{errors.primaryWork}</span>}

          {situation === 'partner' && (
            <WorkLocationField
              label="And your partner?"
              value={partnerWork}
              onChange={setPartnerWork}
            />
          )}

          {situation === 'roommates' &&
            Array.from({ length: roommateCount }).map((_, i) => (
              <WorkLocationField
                key={i}
                label={`And roommate ${i + 1}?`}
                value={roommateWorks[i] || null}
                onChange={(v) => setRoommateWorks(s => ({ ...s, [i]: v }))}
              />
            ))}
        </section>
      )}

      {/* Q5 — Commute tolerance */}
      <section className="q-section">
        <label className="q-label">How far are you willing to drive?</label>
        <span className="hint">One way, in normal traffic. Be honest with yourself.</span>
        <div className="seg-stack">
          {TOLERANCE.map(t => (
            <button
              key={t.id}
              type="button"
              className={`seg-row ${tolerance === t.id ? 'active' : ''}`}
              onClick={() => setTolerance(t.id)}
            >
              <span className="seg-label">{t.label}</span>
              <span className="seg-sub">{t.sub}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="budget-preview">
        Est. max rent at {Math.round(strategyPct * 100)}%: <strong>{fmt(maxRent)}/mo</strong>
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? 'Crunching the map for you…' : 'Show me what fits →'}
      </button>
    </form>
  );
}

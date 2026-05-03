import { useMemo, useState } from 'react';
import IncomeInput, { validateIncome } from './IncomeInput';
import WorkLocationField from './WorkLocationField';
import { GlowCard } from './GlowCard';

const DEFAULT_RENT_PCT = 30;
const MIN_RENT_PCT = 5;
const MAX_RENT_PCT = 80;

const SITUATIONS = [
  { id: 'solo', label: 'Solo' },
  { id: 'partner', label: 'Partner' },
  { id: 'roommates', label: 'Roommates' },
  { id: 'family', label: 'Family' },
];

const TOLERANCE = [
  { id: 'walk', label: 'Walk or bike', sub: 'under 10 min' },
  { id: 'short', label: 'Short drive', sub: '10–20 min' },
  { id: 'long', label: "Don't mind a drive", sub: '20–35 min' },
  { id: 'remote', label: 'Remote', sub: 'I work from home' },
];

const ROOMMATE_OPTS = [1, 2, 3];

const fmt = (n) => `$${Math.round(n).toLocaleString()}`;

const workLabel = (situation) => {
  if (situation === 'partner' || situation === 'family') return 'Where do you both need to be most days?';
  if (situation === 'roommates') return 'Where does everyone need to be most days?';
  return 'Where do you need to be most days?';
};

export default function OnboardingForm({ onSubmit, loading }) {
  const [annualIncome, setAnnualIncome] = useState(null);
  const [rentPct, setRentPct] = useState('');
  const [situation, setSituation] = useState(null);
  const [partnerIncome, setPartnerIncome] = useState(null);
  const [roommateCount, setRoommateCount] = useState(1);
  const [roommateIncomes, setRoommateIncomes] = useState({});
  const [primaryWork, setPrimaryWork] = useState(null);
  const [partnerWork, setPartnerWork] = useState(null);
  const [roommateWorks, setRoommateWorks] = useState({});
  const [kidsCount, setKidsCount] = useState(1);
  const [tolerance, setTolerance] = useState(null);
  const [errors, setErrors] = useState({});

  const isRemoteOnly = tolerance === 'remote';

  const incomes = useMemo(() => {
    const list = [annualIncome || 0];
    if ((situation === 'partner' || situation === 'family') && partnerIncome) {
      list.push(Number(partnerIncome));
    }
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
    ((situation === 'partner' || situation === 'family') && partnerIncome) ||
    (situation === 'roommates' && Object.values(roommateIncomes).some(v => v));

  const strategyPct = Math.max(MIN_RENT_PCT, Math.min(MAX_RENT_PCT, rentPct || DEFAULT_RENT_PCT)) / 100;
  const maxRent = Math.round((combinedAnnual * strategyPct) / 12);
  const annualHousingEst = maxRent * 12;
  const housingPctOfIncome = combinedAnnual > 0 ? ((annualHousingEst / combinedAnnual) * 100).toFixed(1) : 0;

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
    if ((situation === 'partner' || situation === 'family') && partnerWork && !partnerWork.remote) {
      workLocations.push(partnerWork);
    }
    if (situation === 'roommates') {
      Object.values(roommateWorks).forEach(w => {
        if (w && !w.remote) workLocations.push(w);
      });
    }

    onSubmit({
      annualIncome,
      housingStrategy: `custom-${rentPct}pct`,
      strategyPct,
      livingSituation: situation,
      partnerIncome: (situation === 'partner' || situation === 'family') ? Number(partnerIncome) || null : null,
      kidsCount: situation === 'family' ? kidsCount : 0,
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
      <GlowCard className="q-section" radius={22}>
        <IncomeInput
          value={annualIncome}
          onChange={setAnnualIncome}
          error={errors.annualIncome}
        />
      </GlowCard>

      {/* Q2 — Rent allocation % */}
      <GlowCard className="q-section" radius={22}>
        <label className="q-label">How much of your income feels comfortable for rent?</label>
        <span className="hint">Most people land between 25–35%.</span>
        <div className="rent-pct-input">
          <input
            type="number"
            inputMode="numeric"
            min={MIN_RENT_PCT}
            max={MAX_RENT_PCT}
            placeholder={String(DEFAULT_RENT_PCT)}
            value={rentPct}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') { setRentPct(''); return; }
              const n = parseInt(v, 10);
              if (!Number.isNaN(n)) setRentPct(n);
            }}
            onBlur={() => {
              if (rentPct === '' || rentPct < MIN_RENT_PCT) setRentPct(MIN_RENT_PCT);
              if (rentPct > MAX_RENT_PCT) setRentPct(MAX_RENT_PCT);
            }}
          />
          <span className="pct-suffix">%</span>
        </div>
        {combinedAnnual > 0 && (
          <div className="rent-estimate-box">
            <div className="rent-estimate-row">
              <span>Est. monthly rent budget</span>
              <strong>{fmt(maxRent)}/mo</strong>
            </div>
            <div className="rent-estimate-row">
              <span>Est. annual housing cost</span>
              <strong>{fmt(annualHousingEst)}/yr</strong>
            </div>
            <div className="rent-estimate-row">
              <span>That's</span>
              <strong>{housingPctOfIncome}% of your income</strong>
            </div>
            {strategyPct > 0.40 && (
              <span className="rent-warn">⚠️ Over 40% is considered cost-burdened</span>
            )}
            {strategyPct <= 0.28 && (
              <span className="rent-good">✓ Under 28% — comfortable range</span>
            )}
          </div>
        )}
      </GlowCard>

      {/* Q3 — Living situation */}
      <GlowCard className="q-section" radius={22}>
        <label className="q-label">Who's moving with you?</label>
        <div className="situation-grid">
          {SITUATIONS.map(s => (
            <button
              key={s.id}
              type="button"
              className={`situation-btn ${situation === s.id ? 'active' : ''}`}
              onClick={() => setSituation(s.id)}
            >
              <span className="situation-label">{s.label}</span>
            </button>
          ))}
        </div>

        {(situation === 'partner' || situation === 'family') && (
          <div className="form-group nested">
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

        {situation === 'family' && (
          <div className="form-group nested">
            <label>How many kids?</label>
            <div className="seg-row-h">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`seg-pill ${kidsCount === n ? 'active' : ''}`}
                  onClick={() => setKidsCount(n)}
                >
                  {n === 3 ? '3+' : n}
                </button>
              ))}
            </div>
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
      </GlowCard>

      {/* Q4 — Work locations */}
      {!isRemoteOnly && (
        <GlowCard className="q-section" radius={22}>
          <label className="q-label">{workLabel(situation)}</label>
          <WorkLocationField
            label=""
            value={primaryWork}
            onChange={setPrimaryWork}
          />
          {errors.primaryWork && <span className="error-msg">{errors.primaryWork}</span>}

          {(situation === 'partner' || situation === 'family') && (
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
        </GlowCard>
      )}

      {/* Q5 — Commute tolerance */}
      <GlowCard className="q-section" radius={22}>
        <label className="q-label">What's your commute limit?</label>
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
      </GlowCard>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? 'Crunching the map for you…' : 'Find my dream place →'}
      </button>
    </form>
  );
}

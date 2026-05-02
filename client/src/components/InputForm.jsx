import { useState } from 'react';
import IncomeInput, { validateIncome } from './IncomeInput';

const VIBES = [
  { id: 'urban',    label: '🏙️ Urban',    desc: 'Walkable, downtown energy' },
  { id: 'coastal',  label: '🌊 Coastal',  desc: 'Beach access, ocean views' },
  { id: 'suburban', label: '🌳 Suburban', desc: 'Quiet, spacious, family-friendly' },
  { id: 'college',  label: '🎓 College',  desc: 'Young, lively, near Cal Poly' },
  { id: 'any',      label: '🤷 Any',      desc: 'Open to everything' },
];

const MUST_HAVES = [
  { id: 'parking',  label: '🚗 Parking' },
  { id: 'laundry',  label: '🧺 In-unit laundry' },
  { id: 'pet',      label: '🐾 Pet-friendly' },
  { id: 'outdoor',  label: '🌿 Outdoor space' },
  { id: 'ac',       label: '❄️ A/C' },
];

const WORK_LOCATIONS = [
  { id: 'remote',        label: '🏠 Remote',         desc: 'Work from home' },
  { id: 'downtown-slo',  label: '🏙️ Downtown SLO',  desc: 'City center, ~5 min drive' },
  { id: 'cal-poly',      label: '🎓 Cal Poly',        desc: 'University campus' },
  { id: 'airport',       label: '✈️ Airport / Tech', desc: 'Industrial / tech park' },
  { id: 'atascadero',    label: '🌆 Atascadero',     desc: 'North county, ~20 min' },
  { id: 'arroyo-grande', label: '🌸 Arroyo Grande',  desc: 'South county, ~15 min' },
];

const AMENITIES = [
  { id: 'groceries', label: '🛒 Grocery store', examples: 'Trader Joe\'s, Vons, Sprouts' },
  { id: 'hospital',  label: '🏥 Hospital / Urgent care', examples: 'Sierra Vista, French Hospital' },
  { id: 'beach',     label: '🏖️ Beach access', examples: 'Pismo, Morro Bay, Avila' },
  { id: 'dining',    label: '🍽️ Restaurants & bars', examples: 'Downtown SLO, Pismo strip' },
  { id: 'gym',       label: '💪 Gym / Fitness', examples: 'Planet Fitness, CrossFit, YMCA' },
  { id: 'trails',    label: '🌲 Hiking & trails', examples: 'Bishop Peak, Montana de Oro' },
  { id: 'downtown',  label: '🎪 Downtown SLO', examples: 'Farmers market, shops, nightlife' },
  { id: 'freeway',   label: '🛣️ Freeway access', examples: 'US-101 on-ramp' },
];

const DISTANCE_OPTS = [
  { id: 'walking', label: 'Walking', sub: '<1 mile' },
  { id: 'short',   label: 'Short drive', sub: '5–10 min' },
  { id: 'any',     label: "Don't care", sub: '' },
];

export default function InputForm({ form, setForm, onSubmit }) {
  const [errors, setErrors] = useState({});
  const [section, setSection] = useState('basics');

  const validate = () => {
    const e = {};
    if (!form.jobTitle.trim()) e.jobTitle = 'Required';
    const salaryErr = validateIncome(form.salary);
    if (salaryErr) e.salary = salaryErr;
    if (form.savings < 0) e.savings = 'Cannot be negative';
    if (form.maxRent && form.maxRent < 500) e.maxRent = 'Too low';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    onSubmit(form);
  };

  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const toggleMustHave = (id) => {
    const current = form.mustHaves || [];
    field('mustHaves', current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };

  const setAmenityPref = (amenityId, distId) => {
    field('proximityPrefs', { ...(form.proximityPrefs || {}), [amenityId]: distId });
  };

  const mustHaves = form.mustHaves || [];
  const proximityPrefs = form.proximityPrefs || {};
  const defaultMax = form.salary ? Math.round((form.salary / 12) * 0.35) : 2000;

  const activePrefCount = Object.values(proximityPrefs).filter(v => v !== 'any').length;

  return (
    <form className="input-form card" onSubmit={handleSubmit}>
      <div className="form-tabs">
        <button type="button" className={`form-tab ${section === 'basics' ? 'active' : ''}`} onClick={() => setSection('basics')}>
          Basics
        </button>
        <button type="button" className={`form-tab ${section === 'prefs' ? 'active' : ''}`} onClick={() => setSection('prefs')}>
          Preferences {activePrefCount > 0 && <span className="tab-badge">{activePrefCount}</span>}
        </button>
      </div>

      {section === 'basics' && (
        <>
          <div className="form-group">
            <label>Job Title</label>
            <input
              type="text"
              placeholder="e.g. Software Engineer"
              value={form.jobTitle}
              onChange={e => field('jobTitle', e.target.value)}
              className={errors.jobTitle ? 'error' : ''}
            />
            {errors.jobTitle && <span className="error-msg">{errors.jobTitle}</span>}
          </div>

          <IncomeInput
            value={form.salary}
            onChange={(v) => field('salary', v)}
            error={errors.salary}
          />

          <div className="form-group">
            <label>Current Savings</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number" min="0" step="500"
                value={form.savings || ''}
                onChange={e => field('savings', e.target.value === '' ? '' : Number(e.target.value))}
                className={errors.savings ? 'error' : ''}
              />
            </div>
            {errors.savings && <span className="error-msg">{errors.savings}</span>}
          </div>

          <div className="form-group">
            <label>Max Monthly Rent Budget</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number" min="500" step="50"
                placeholder={String(defaultMax)}
                value={form.maxRent || ''}
                onChange={e => field('maxRent', e.target.value ? Number(e.target.value) : null)}
                className={errors.maxRent ? 'error' : ''}
              />
            </div>
            {errors.maxRent && <span className="error-msg">{errors.maxRent}</span>}
            <span className="hint">Leave blank to use income % only</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Roommates</label>
              <select value={form.roommates} onChange={e => field('roommates', Number(e.target.value))}>
                {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Have a Car?</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${form.hasCar ? 'active' : ''}`} onClick={() => field('hasCar', true)}>Yes</button>
                <button type="button" className={`toggle-btn ${!form.hasCar ? 'active' : ''}`} onClick={() => field('hasCar', false)}>No</button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Work Setup</label>
              <select value={form.workSetup || 'hybrid'} onChange={e => field('workSetup', e.target.value)}>
                <option value="remote">🏠 Remote</option>
                <option value="hybrid">🔀 Hybrid</option>
                <option value="office">🏢 In-office</option>
              </select>
            </div>
            <div className="form-group">
              <label>Have a Pet?</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${form.hasPet ? 'active' : ''}`} onClick={() => field('hasPet', true)}>Yes</button>
                <button type="button" className={`toggle-btn ${!form.hasPet ? 'active' : ''}`} onClick={() => field('hasPet', false)}>No</button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Eating Out</label>
            <div className="lifestyle-group">
              {['never', 'sometimes', 'often'].map(opt => (
                <button key={opt} type="button"
                  className={`lifestyle-btn ${form.lifestyle === opt ? 'active' : ''}`}
                  onClick={() => field('lifestyle', opt)}
                >
                  {opt === 'never' ? '🥗 Never' : opt === 'sometimes' ? '🍕 Sometimes' : '🍜 Often'}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="next-btn" onClick={() => setSection('prefs')}>
            Set Location Preferences →
          </button>
        </>
      )}

      {section === 'prefs' && (
        <>
          <div className="form-group">
            <label>Neighborhood Vibe</label>
            <div className="vibe-grid">
              {VIBES.map(v => (
                <button key={v.id} type="button"
                  className={`vibe-btn ${(form.vibe || 'any') === v.id ? 'active' : ''}`}
                  onClick={() => field('vibe', v.id)}
                >
                  <span className="vibe-label">{v.label}</span>
                  <span className="vibe-desc">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Where Do You Work?</label>
            <div className="work-location-grid">
              {WORK_LOCATIONS.map(w => (
                <button key={w.id} type="button"
                  className={`work-loc-btn ${(form.workLocation || 'remote') === w.id ? 'active' : ''}`}
                  onClick={() => field('workLocation', w.id)}
                >
                  <span className="work-loc-label">{w.label}</span>
                  <span className="work-loc-desc">{w.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>What Do You Need Nearby?</label>
            <p className="pref-hint">Pick how close each amenity matters to you</p>
            <div className="amenity-list">
              {AMENITIES.map(am => (
                <div key={am.id} className="amenity-row">
                  <div className="amenity-info">
                    <span className="amenity-label">{am.label}</span>
                    <span className="amenity-examples">{am.examples}</span>
                  </div>
                  <div className="amenity-opts">
                    {DISTANCE_OPTS.map(d => (
                      <button key={d.id} type="button"
                        className={`dist-btn ${(proximityPrefs[am.id] || 'any') === d.id ? 'active' : ''}`}
                        onClick={() => setAmenityPref(am.id, d.id)}
                        title={d.sub}
                      >
                        <span>{d.label}</span>
                        {d.sub && <span className="dist-sub">{d.sub}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Must-Haves in the Unit</label>
            <div className="must-haves-grid">
              {MUST_HAVES.map(m => (
                <button key={m.id} type="button"
                  className={`must-have-btn ${mustHaves.includes(m.id) ? 'active' : ''}`}
                  onClick={() => toggleMustHave(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Move-In Timeline</label>
            <select value={form.timeline || 'asap'} onChange={e => field('timeline', e.target.value)}>
              <option value="asap">ASAP</option>
              <option value="1-3mo">1–3 months</option>
              <option value="3-6mo">3–6 months</option>
              <option value="6mo+">6+ months</option>
            </select>
          </div>

          {(form.maxRent || mustHaves.length > 0 || activePrefCount > 0) && (
            <div className="pref-summary">
              {form.maxRent && <span className="pref-tag">Max ${form.maxRent.toLocaleString()}/mo</span>}
              {form.vibe && form.vibe !== 'any' && <span className="pref-tag">{VIBES.find(v => v.id === form.vibe)?.label}</span>}
              {mustHaves.map(id => <span key={id} className="pref-tag">{MUST_HAVES.find(m => m.id === id)?.label}</span>)}
              {Object.entries(proximityPrefs).filter(([, v]) => v !== 'any').map(([k, v]) => (
                <span key={k} className="pref-tag">
                  {AMENITIES.find(a => a.id === k)?.label.split(' ').slice(0, 2).join(' ')} · {v === 'walking' ? 'walking' : 'short drive'}
                </span>
              ))}
            </div>
          )}

          <button type="submit" className="submit-btn">
            Analyze My Affordability →
          </button>
        </>
      )}
    </form>
  );
}

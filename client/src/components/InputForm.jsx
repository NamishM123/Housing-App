import { useState } from 'react';

const VIBES = [
  { id: 'urban',    label: '🏙️ Urban', desc: 'Walkable, downtown energy' },
  { id: 'coastal',  label: '🌊 Coastal', desc: 'Beach access, ocean views' },
  { id: 'suburban', label: '🌳 Suburban', desc: 'Quiet, spacious, family-friendly' },
  { id: 'college',  label: '🎓 College', desc: 'Young, lively, near Cal Poly' },
  { id: 'any',      label: '🤷 Any',  desc: 'Open to everything' },
];

const MUST_HAVES = [
  { id: 'parking',  label: '🚗 Parking' },
  { id: 'laundry',  label: '🧺 In-unit laundry' },
  { id: 'pet',      label: '🐾 Pet-friendly' },
  { id: 'outdoor',  label: '🌿 Outdoor space' },
  { id: 'ac',       label: '❄️ A/C' },
];

export default function InputForm({ form, setForm, onSubmit }) {
  const [errors, setErrors] = useState({});
  const [section, setSection] = useState('basics'); // 'basics' | 'prefs'

  const validate = () => {
    const e = {};
    if (!form.jobTitle.trim()) e.jobTitle = 'Required';
    if (!form.salary || form.salary < 1) e.salary = 'Enter valid salary';
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
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    field('mustHaves', next);
  };

  const mustHaves = form.mustHaves || [];
  const defaultMax = form.salary ? Math.round((form.salary / 12) * 0.35) : 2000;

  return (
    <form className="input-form card" onSubmit={handleSubmit}>
      <div className="form-tabs">
        <button type="button" className={`form-tab ${section === 'basics' ? 'active' : ''}`} onClick={() => setSection('basics')}>
          Basics
        </button>
        <button type="button" className={`form-tab ${section === 'prefs' ? 'active' : ''}`} onClick={() => setSection('prefs')}>
          Preferences
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

          <div className="form-group">
            <label>Annual Salary</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number"
                min="1"
                step="1000"
                value={form.salary}
                onChange={e => field('salary', Number(e.target.value))}
                className={errors.salary ? 'error' : ''}
              />
            </div>
            {errors.salary && <span className="error-msg">{errors.salary}</span>}
            <span className="hint">${Math.round(form.salary / 12).toLocaleString()}/mo gross</span>
          </div>

          <div className="form-group">
            <label>Current Savings</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="500"
                value={form.savings}
                onChange={e => field('savings', Number(e.target.value))}
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
                type="number"
                min="500"
                step="50"
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
                {[0, 1, 2, 3].map(n => (
                  <option key={n} value={n}>{n === 0 ? 'None' : n}</option>
                ))}
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
            <label>Eating Out Frequency</label>
            <div className="lifestyle-group">
              {['never', 'sometimes', 'often'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`lifestyle-btn ${form.lifestyle === opt ? 'active' : ''}`}
                  onClick={() => field('lifestyle', opt)}
                >
                  {opt === 'never' ? '🥗 Never' : opt === 'sometimes' ? '🍕 Sometimes' : '🍜 Often'}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="next-btn" onClick={() => setSection('prefs')}>
            Set Preferences →
          </button>
        </>
      )}

      {section === 'prefs' && (
        <>
          <div className="form-group">
            <label>Neighborhood Vibe</label>
            <div className="vibe-grid">
              {VIBES.map(v => (
                <button
                  key={v.id}
                  type="button"
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
            <label>Commute Tolerance</label>
            <div className="lifestyle-group">
              {[
                { id: 'short', label: '⚡ Short (<15 min)' },
                { id: 'medium', label: '🚗 Medium (<30 min)' },
                { id: 'long', label: '😅 Long (30+ min)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`lifestyle-btn ${(form.commute || 'medium') === opt.id ? 'active' : ''}`}
                  onClick={() => field('commute', opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Must-Haves</label>
            <div className="must-haves-grid">
              {MUST_HAVES.map(m => (
                <button
                  key={m.id}
                  type="button"
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

          <div className="pref-summary">
            {form.maxRent && <span className="pref-tag">Max ${form.maxRent.toLocaleString()}/mo</span>}
            {form.vibe && form.vibe !== 'any' && <span className="pref-tag">{VIBES.find(v => v.id === form.vibe)?.label}</span>}
            {mustHaves.map(id => <span key={id} className="pref-tag">{MUST_HAVES.find(m => m.id === id)?.label}</span>)}
            {form.hasPet && <span className="pref-tag">🐾 Pet</span>}
          </div>

          <button type="submit" className="submit-btn">
            Analyze My Affordability →
          </button>
        </>
      )}
    </form>
  );
}

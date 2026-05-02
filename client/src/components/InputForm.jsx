import { useState } from 'react';

export default function InputForm({ form, setForm, onSubmit }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.jobTitle.trim()) e.jobTitle = 'Required';
    if (!form.salary || form.salary < 1) e.salary = 'Enter valid salary';
    if (form.savings < 0) e.savings = 'Cannot be negative';
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

  return (
    <form className="input-form card" onSubmit={handleSubmit}>
      <h2 className="section-title">Your Profile</h2>

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
        <span className="hint">${Math.round(form.salary / 12).toLocaleString()}/mo take-home estimate</span>
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
            <button
              type="button"
              className={`toggle-btn ${form.hasCar ? 'active' : ''}`}
              onClick={() => field('hasCar', true)}
            >Yes</button>
            <button
              type="button"
              className={`toggle-btn ${!form.hasCar ? 'active' : ''}`}
              onClick={() => field('hasCar', false)}
            >No</button>
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

      <button type="submit" className="submit-btn">
        Analyze My Affordability →
      </button>
    </form>
  );
}

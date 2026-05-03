const MIN = 10_000;
const MAX = 1_000_000;

export default function IncomeInput({ value, onChange, error }) {
  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') { onChange(null); return; }
    const cleaned = raw.replace(/[^\d]/g, '');
    onChange(cleaned === '' ? null : Number(cleaned));
  };

  return (
    <div className="form-group income-input">
      <label className="q-label">What's Your Annual Income?</label>
      <div className="input-prefix">
        <span>$</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="65000"
          value={value ?? ''}
          onChange={handleChange}
          className={error ? 'error' : ''}
        />
      </div>
      {error && <span className="error-msg">{error}</span>}
    </div>
  );
}

export function validateIncome(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) {
    return 'Annual Income Is Required';
  }
  const n = Number(value);
  if (n < MIN) return `Minimum Income Is $${MIN.toLocaleString()}`;
  if (n > MAX) return `Maximum Income Is $${MAX.toLocaleString()}`;
  return null;
}

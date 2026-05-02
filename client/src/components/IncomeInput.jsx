const MIN = 10_000;
const MAX = 1_000_000;

export default function IncomeInput({ value, onChange, error }) {
  const numeric = Number(value) || 0;
  const monthly = numeric > 0 ? Math.round(numeric / 12) : 0;

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') { onChange(null); return; }
    const cleaned = raw.replace(/[^\d]/g, '');
    onChange(cleaned === '' ? null : Number(cleaned));
  };

  return (
    <div className="form-group income-input">
      <label>What's your annual income?</label>
      <span className="hint">Pre-tax. Round numbers are fine.</span>
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
      {numeric > 0 && !error && (
        <span className="income-monthly">
          That's about ${monthly.toLocaleString()} a month coming in.
        </span>
      )}
    </div>
  );
}

export function validateIncome(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) {
    return 'Annual income is required';
  }
  const n = Number(value);
  if (n < MIN) return `Minimum income is $${MIN.toLocaleString()}`;
  if (n > MAX) return `Maximum income is $${MAX.toLocaleString()}`;
  return null;
}

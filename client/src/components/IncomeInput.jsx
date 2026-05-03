const MIN = 10_000;
const MAX = 1_000_000;
const SLIDER_STEPS = 1000;
const CURVE = 2.5; // power curve — more resolution at the low end

const incomeToSlider = (n) => {
  if (!n || n <= MIN) return 0;
  if (n >= MAX) return SLIDER_STEPS;
  const t = (n - MIN) / (MAX - MIN);
  return Math.round(Math.pow(t, 1 / CURVE) * SLIDER_STEPS);
};

const sliderToIncome = (s) => {
  const t = Math.pow(s / SLIDER_STEPS, CURVE);
  const raw = MIN + t * (MAX - MIN);
  // Snap to friendly increments — $1k under $200k, $5k above.
  const step = raw < 200_000 ? 1000 : 5000;
  return Math.round(raw / step) * step;
};

export default function IncomeInput({ value, onChange, error }) {
  const numeric = Number(value) || 0;
  const monthly = numeric > 0 ? Math.round(numeric / 12) : 0;
  const sliderPos = incomeToSlider(numeric);

  const handleTextChange = (e) => {
    const raw = e.target.value;
    if (raw === '') { onChange(null); return; }
    const cleaned = raw.replace(/[^\d]/g, '');
    onChange(cleaned === '' ? null : Number(cleaned));
  };

  const handleSliderChange = (e) => {
    onChange(sliderToIncome(Number(e.target.value)));
  };

  // Visual fill % matches slider thumb position
  const fillPct = (sliderPos / SLIDER_STEPS) * 100;

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
          onChange={handleTextChange}
          className={error ? 'error' : ''}
        />
      </div>
      <div className="income-slider-row">
        <input
          type="range"
          min={0}
          max={SLIDER_STEPS}
          step={1}
          value={sliderPos}
          onChange={handleSliderChange}
          className="income-slider"
          style={{ '--fill': `${fillPct}%` }}
          aria-label="Annual income slider"
        />
        <div className="income-slider-scale">
          <span>${(MIN / 1000).toFixed(0)}k</span>
          <span>$100k</span>
          <span>$300k</span>
          <span>${(MAX / 1000).toFixed(0)}k</span>
        </div>
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
